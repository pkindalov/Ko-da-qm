import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { InteractiveFridge } from './InteractiveFridge';
import { Modal } from '../../../shared/components/Modal';
import { Badge } from '../../../shared/components/Badge';
import { ConfirmDeleteModal } from '../../../shared/components/ConfirmDeleteModal';
import { EmptyState } from '../../../shared/components/EmptyState';
import { matchFromFridge, type MatchedRecipe } from '../utils/matchFromFridge';
import { searchByFridge, toEnglish } from '../utils/searchTheMealDB';
import { searchWithGemini } from '../utils/searchWithGemini';
import { useSaveGeminiRecipe } from '../hooks/useSaveGeminiRecipe';
import { openGoogleTranslate } from '../../../shared/utils/openGoogleTranslate';
import { recipeDisplayName } from '../../../shared/utils/recipeDisplayName';
import { SaveTranslationModal } from '../../../shared/components/SaveTranslationModal';
import { CATEGORIES } from '../../../shared/constants/categories';
import type { FridgeItem, Profile, Recipe, Language, Product, ProductStatus } from '../../../shared/types';

const FRIDGE_EMOJIS = ['🥚', '🧀', '🍞', '🧈', '🥛', '🍚', '🍗', '🥔', '🍎', '🍅', '🥕', '🥦', '🧅', '🫙', '📦'];

interface FridgeScreenProps {
  fridge: FridgeItem[];
  addFridgeItem: (item: Omit<FridgeItem, 'id'>) => Promise<void>;
  removeFridgeItem: (id: string) => Promise<void>;
  removeProduct?: (id: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  addRecipe: (recipe: Recipe) => void;
  removeRecipe: (id: string) => void;
  updateRecipe?: (recipe: Recipe) => void;
  profile: Profile;
  recipes: Recipe[];
  products: Product[];
  lang: Language;
}

export const FridgeScreen = ({ fridge, addFridgeItem, removeFridgeItem, removeProduct, addProduct, addRecipe, removeRecipe, updateRecipe, profile, recipes, products, lang }: FridgeScreenProps) => {
  const isEnglish = lang === 'en';

  const productStatusByName = useMemo(() => {
    const map = new Map<string, 'disliked' | 'allergic'>();
    for (const p of products) {
      if (p.status === 'disliked' || p.status === 'allergic') {
        map.set(p.name.toLowerCase(), p.status);
      }
    }
    return map;
  }, [products]);

  const [newItem, setNewItem] = useState('');
  const [newEmoji, setNewEmoji] = useState('📦');
  const [newCategory, setNewCategory] = useState<FridgeItem['category']>('other');
  const [newStatus, setNewStatus] = useState<ProductStatus>('liked');
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'select' | 'manual'>('select');
  const [productSearch, setProductSearch] = useState('');
  const [suggestions, setSuggestions] = useState<MatchedRecipe[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [geminiMode, setGeminiMode] = useState(false);
  const [fridgeExpanded, setFridgeExpanded] = useState(true);
  const [matchingExpanded, setMatchingExpanded] = useState(false);
  const [pendingSaveRecipe, setPendingSaveRecipe] = useState<MatchedRecipe | null>(null);
  const [seenGeminiNames, setSeenGeminiNames] = useState<string[]>([]);
  const [seenApiIds, setSeenApiIds] = useState<string[]>([]);
  const [suggestionSource, setSuggestionSource] = useState<'gemini' | 'api' | null>(null);
  const [loadingMoreSuggestions, setLoadingMoreSuggestions] = useState(false);
  const { savedIdMap, savingId, saveError, saveRecipe, unsaveRecipe, clearSaveError } = useSaveGeminiRecipe(profile.name, addRecipe, removeRecipe, lang);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const [pendingRemoveItemId, setPendingRemoveItemId] = useState<string | null>(null);
  const [pendingRemoveSuggestionId, setPendingRemoveSuggestionId] = useState<string | null>(null);
  const [saveTranslationFor, setSaveTranslationFor] = useState<MatchedRecipe | null>(null);
  const [showTranslationHelp, setShowTranslationHelp] = useState(false);

  const handleTranslateCard = async (r: MatchedRecipe) => {
    const { clipboardUsed } = await openGoogleTranslate(r);
    if (clipboardUsed) {
      toast.info('Рецептата е копирана. Натисни Ctrl+V в Google Translate.');
    }
  };

  const removeItem = (id: string) => {
    removeFridgeItem(id);
    toast.success(isEnglish ? 'Item removed' : 'Продуктът е премахнат');
  };

  const openAddModal = () => {
    setAddMode(products.length > 0 ? 'select' : 'manual');
    setProductSearch('');
    setNewItem('');
    setNewEmoji('📦');
    setNewCategory('other');
    setNewStatus('liked');
    setAddOpen(true);
  };

  const closeAddModal = () => {
    setAddOpen(false);
    setProductSearch('');
    setNewItem('');
    setNewEmoji('📦');
    setNewCategory('other');
    setNewStatus('liked');
  };

  const addItemManually = async () => {
    if (!newItem.trim()) return;
    const trimmedName = newItem.trim();
    const isDuplicate = products.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (!isDuplicate) {
      await addProduct({ name: trimmedName, emoji: newEmoji, category: newCategory, status: newStatus });
    }
    await addFridgeItem({ name: trimmedName, emoji: newEmoji, category: newCategory });
    closeAddModal();
  };

  const addFromProduct = async (product: Product) => {
    await addFridgeItem({ name: product.name, emoji: product.emoji, category: product.category });
    closeAddModal();
  };

  const availableProducts = products.filter(
    (p) => !fridge.some((f) => f.name.toLowerCase() === p.name.toLowerCase()),
  );

  const filteredProducts = productSearch
    ? availableProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          (p.nameEn && p.nameEn.toLowerCase().includes(productSearch.toLowerCase())),
      )
    : availableProducts;

  const allergicEntries = [
    ...profile.allergies,
    ...products.filter(p => p.status === 'allergic').flatMap(p => p.nameEn ? [p.name, p.nameEn] : [p.name]),
  ];
  const dislikedEntries = [
    ...profile.dislikes,
    ...products.filter(p => p.status === 'disliked').flatMap(p => p.nameEn ? [p.name, p.nameEn] : [p.name]),
  ];
  const blocked = [...allergicEntries, ...dislikedEntries];

  const nameMatches = (name: string, entries: string[]) =>
    entries.some((b) => name.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(name.toLowerCase()));

  const safeFridge = fridge.filter((item) => !nameMatches(item.name, blocked));

  const searchFridge = selectedItemIds.size > 0
    ? safeFridge.filter((i) => selectedItemIds.has(i.id))
    : safeFridge;

  const blockedFridgeItems = fridge
    .filter((item) => nameMatches(item.name, blocked))
    .map((item) => ({
      ...item,
      reason: nameMatches(item.name, allergicEntries) ? 'allergic' as const : 'disliked' as const,
    }));

  const containsBlocked = (allIngredients: string[]) =>
    allIngredients.some((ing) => nameMatches(ing, blocked));

  const filterSafe = (results: MatchedRecipe[]) =>
    results.filter((r) => !containsBlocked([...r.requiredIngredients, ...r.ingredients]));

  const handleWhatCanICook = async () => {
    setLoadingSuggestions(true);
    setSuggestions(null);
    setSeenGeminiNames([]);
    setSeenApiIds([]);
    setSuggestionSource(null);
    try {
      if (geminiMode) {
        const results = filterSafe(await searchWithGemini(searchFridge, blocked, lang));
        setSuggestions(results);
        setSeenGeminiNames(results.map((r) => r.name));
        setSuggestionSource('gemini');
        if (results.length > 0) toast.success(isEnglish ? `Found ${results.length} recipe${results.length === 1 ? '' : 's'}` : `Намерени ${results.length} рецепти`);
      } else {
        const online = filterSafe(await searchByFridge(searchFridge, blocked));
        if (online.length > 0) {
          setSuggestions(online);
          setSeenApiIds(online.map((r) => r.id));
          toast.success(isEnglish ? `Found ${online.length} recipe${online.length === 1 ? '' : 's'}` : `Намерени ${online.length} рецепти`);
        } else {
          const local = filterSafe(await matchFromFridge(searchFridge, blocked));
          setSuggestions(local);
          setSeenApiIds(local.map((r) => r.id));
          if (local.length > 0) toast.success(isEnglish ? `Found ${local.length} recipe${local.length === 1 ? '' : 's'}` : `Намерени ${local.length} рецепти`);
        }
        setSuggestionSource('api');
      }
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleTryDifferentRecipeApi = async () => {
    setLoadingMoreSuggestions(true);
    try {
      const online = filterSafe(await searchByFridge(searchFridge, blocked, seenApiIds));
      if (online.length > 0) {
        setSuggestions(online);
        setSeenApiIds((prev) => [...prev, ...online.map((r) => r.id)]);
        toast.success(isEnglish ? `Found ${online.length} recipe${online.length === 1 ? '' : 's'}` : `Намерени ${online.length} рецепти`);
      } else {
        const local = filterSafe(await matchFromFridge(searchFridge, blocked, seenApiIds));
        setSuggestions(local);
        setSeenApiIds((prev) => [...prev, ...local.map((r) => r.id)]);
        if (local.length > 0) toast.success(isEnglish ? `Found ${local.length} recipe${local.length === 1 ? '' : 's'}` : `Намерени ${local.length} рецепти`);
      }
    } finally {
      setLoadingMoreSuggestions(false);
    }
  };

  const handleTryDifferentSuggestions = async () => {
    setLoadingMoreSuggestions(true);
    try {
      const results = filterSafe(await searchWithGemini(searchFridge, blocked, lang, seenGeminiNames));
      const newResults = results.filter((r) => !seenGeminiNames.includes(r.name));
      setSuggestions(newResults);
      setSeenGeminiNames((prev) => [...prev, ...newResults.map((r) => r.name)]);
      if (newResults.length > 0) toast.success(isEnglish ? `Found ${newResults.length} recipe${newResults.length === 1 ? '' : 's'}` : `Намерени ${newResults.length} рецепти`);
    } finally {
      setLoadingMoreSuggestions(false);
    }
  };

  const handleOpenSaveModal = (recipe: MatchedRecipe) => {
    clearSaveError();
    setPendingSaveRecipe(recipe);
  };

  const handleSaveWithVisibility = async (isPublic: boolean) => {
    if (!pendingSaveRecipe) return;
    const success = await saveRecipe(pendingSaveRecipe, isPublic);
    if (success) setPendingSaveRecipe(null);
  };

  const savedRecipeByName = new Map(recipes.map((r) => [r.name, r.id]));

  const matchingRecipes = recipes.filter((r) => {
    const safe = !r.requiredIngredients?.some((i) => blocked.some((b) => i.toLowerCase().includes(b)));
    const hasIngredients = r.requiredIngredients?.some((i) =>
      fridge.some((f) => f.name.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(f.name.toLowerCase())),
    );
    return safe && hasIngredients;
  });

  return (
    <div className="fade-in">
      <div className="topbar">
        <div className="breadcrumb">
          {isEnglish ? 'Kitchen' : 'Кухня'} <span>/ {isEnglish ? 'Fridge' : 'Хладилник'}</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={openAddModal}>
            + {isEnglish ? 'Add item' : 'Добави'}
          </button>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-mb">{isEnglish ?"What's inside" : 'Какво е вътре'}</div>
          <h1 className="h-title italic">{isEnglish ? 'Fridge' : 'Хладилник'}</h1>
          <div className="page-head-sub mt-2">
            {isEnglish ? 'Add what you have, remove what you used.' : 'Добави какво имаш, премахни използваното.'}
            {fridge.length > 0 && (
              <button className="fridge-toggle ml-3" onClick={() => setFridgeExpanded((v) => !v)}>
                {fridge.length} {isEnglish ? 'items' : 'продукта'} {fridgeExpanded ? '▲' : '▼'}
              </button>
            )}
          </div>
        </div>
      </div>

      {fridge.length === 0 ? (
        <EmptyState
          icon="🧊"
          title={isEnglish ? 'Empty fridge' : 'Празен хладилник'}
          subtitle={isEnglish ? 'Add what you have at home' : 'Добави какво имаш у дома'}
        />
      ) : fridgeExpanded && (
        <InteractiveFridge
          items={fridge}
          onRemove={(id) => setPendingRemoveItemId(id)}
          onAddSlot={openAddModal}
          lang={lang}
          selectedIds={selectedItemIds}
          onToggleSelect={toggleItemSelection}
          productStatusByName={productStatusByName}
        />
      )}

      {matchingRecipes.length > 0 && (
        <>
          <button className="section-title-toggle" onClick={() => setMatchingExpanded((v) => !v)}>
            {isEnglish ? 'RECIPES FROM WHAT YOU HAVE' : 'РЕЦЕПТИ ОТ НАЛИЧНИ ПРОДУКТИ'}
            <span className="section-title-chevron">{matchingExpanded ? '▲' : '▼'}</span>
          </button>
          {matchingExpanded && (
            <div className="stack mb-5">
              {matchingRecipes.map((r) => (
                <div key={r.id} className="card-sm row">
                  {r.imageUrl
                    ? <img src={r.imageUrl} alt={recipeDisplayName(r, lang)} className="recipe-suggestion-img" />
                    : <span className="emoji-lg">{r.emoji}</span>
                  }
                  <div className="flex-1">
                    <div className="recipe-card-name">{recipeDisplayName(r, lang)}</div>
                    <div className="recipe-card-meta mt-1">⏱ {r.time} {isEnglish ? 'min' : 'мин'}</div>
                  </div>
                  <Badge type="safe">✓ {isEnglish ? 'Safe' : 'Безопасно'}</Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="divider" />
      <div className="row-between mb-3">
        <div className="row-sm">
          <div className="section-title mb-0">
            {geminiMode ? (isEnglish ? '✨ AI SUGGESTIONS' : '✨ ИИ ПРЕДЛОЖЕНИЯ') : (isEnglish ? 'RECIPE SUGGESTIONS' : 'ПРЕДЛОЖЕНИЯ ОТ БАЗАТА')}
          </div>
          {!isEnglish && !geminiMode && (
            <button
              className="btn btn-ghost btn-sm btn-compact"
              onClick={() => setShowTranslationHelp(v => !v)}
              title="Как да запазя превод?"
            >
              ℹ
            </button>
          )}
        </div>
        <div className="toggle-wrap">
          <span className={`toggle-label${geminiMode ? ' active' : ''}`}>Gemini AI</span>
          <label className="toggle">
            <input type="checkbox" checked={geminiMode} onChange={(e) => setGeminiMode(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>
      <p className={`fridge-search-desc${selectedItemIds.size > 0 ? ' fridge-search-desc--compact' : ''}`}>
        {geminiMode
          ? (isEnglish ? 'Ask Gemini AI to suggest recipes from your fridge.' : 'Попитай Gemini ИИ за рецепти от хладилника.')
          : (isEnglish ? 'Find recipes that match what you have at home.' : 'Намери рецепти спрямо наличните продукти и твоите ограничения.')}
      </p>
      {showTranslationHelp && !isEnglish && !geminiMode && (
        <div className="tip-box">
          <div className="tip-box-title">💡 Как да запазя превод на рецепта?</div>
          <div className="tip-list">
            {([
              <>Натисни <strong>„Запази рецептата"</strong>, за да добавиш рецептата в своя списък.</>,
              <>Натисни <strong>„Преведи на български"</strong> — рецептата се копира автоматично в клипборда.</>,
              <>В новия таб на браузъра постави текста (Ctrl+V) в Google Translate, изчакай превода, и го копирай (най-отдолу има иконка с документи отляво до буквата „G").</>,
              <>Върни се тук и натисни <strong>„Запази превод"</strong>, след което попълни преведените полета.</>,
            ] as React.ReactNode[]).map((step, i) => (
              <div key={`tip-${i + 1}`} className="tip-row">
                <span className="tip-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="tip-text">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedItemIds.size > 0 && (
        <p className="fridge-pin-hint">
          {isEnglish
            ? `Searching with ${selectedItemIds.size} selected item${selectedItemIds.size !== 1 ? 's' : ''} only.`
            : selectedItemIds.size === 1
              ? 'Търсене само по 1 избран продукт.'
              : `Търсене само по ${selectedItemIds.size} избрани продукта.`
          }
          {' · '}
          <button
            className="fridge-pin-clear-btn"
            onClick={() => setSelectedItemIds(new Set())}
          >
            {isEnglish ? 'Clear selection' : 'Изчисти избора'}
          </button>
        </p>
      )}
      <button
        className="btn btn-primary btn-full"
        onClick={handleWhatCanICook}
        disabled={fridge.length === 0 || loadingSuggestions}
      >
        {loadingSuggestions
          ? (<><span className="spinner" />{isEnglish ? 'Searching...' : 'Търси...'}</>)
          : geminiMode
            ? `✨ ${isEnglish ? 'Ask Gemini' : 'Попитай Gemini'}`
            : `🔍 ${isEnglish ? 'What can I cook?' : 'Какво мога да готвя?'}`}
      </button>

      {suggestions !== null && (
        <div className="mt-4">
          {blockedFridgeItems.length > 0 && (
            <div className="blocked-box">
              <span className="blocked-label">
                🚫 {isEnglish ? 'Excluded from search:' : 'Изключено от търсенето:'}
              </span>
              {blockedFridgeItems.map((item) => (
                <span
                  key={item.id}
                  className={`badge ${item.reason === 'allergic' ? 'badge-allergic-item' : 'badge-dislike-item'}`}
                >
                  {item.emoji} {item.name} · {item.reason === 'allergic' ? (isEnglish ? 'allergic' : 'алергия') : (isEnglish ? 'disliked' : 'нелюбимо')}
                </span>
              ))}
            </div>
          )}
          {suggestions.length === 0 ? (
            <EmptyState
              icon="😔"
              title={isEnglish ? 'No matches found' : 'Няма съвпадения'}
              subtitle={isEnglish ? 'Try adding more items to your fridge' : 'Добави повече продукти в хладилника'}
            />
          ) : (
            <div className="stack">
              {suggestions.map((r) => {
                const savedId = savedIdMap.get(r.id) ?? savedRecipeByName.get(r.name);
                const savedRecipe = savedId ? recipes.find(rec => rec.id === savedId) : null;
                const hasTranslation = lang === 'bg' && savedRecipe?.ingredientsTranslated?.length;
                const displayName = savedRecipe ? recipeDisplayName(savedRecipe, lang) : recipeDisplayName(r, lang);
                const displayIngredients = hasTranslation ? savedRecipe!.ingredientsTranslated! : r.ingredients;
                const displaySteps = hasTranslation && savedRecipe?.stepsTranslated?.length ? savedRecipe.stepsTranslated : r.steps;
                return (
                <div key={r.id} className={`card-sm ${r.isAI ? 'suggestion-card-ai' : 'suggestion-card'}`}>
                  <div className="row-between mb-2">
                    <div className="row-sm">
                      {r.imageUrl
                        ? <img src={r.imageUrl} alt={displayName} className="recipe-suggestion-img" />
                        : <span className="emoji-md">{r.emoji}</span>
                      }
                      <span className="suggestion-name">{displayName}</span>
                      {r.isAI && <span className="badge badge-neutral suggestion-badge-ai">✨ AI</span>}
                    </div>
                    <span className="badge badge-safe">
                      {r.matchedCount}/{r.requiredIngredients.length} {isEnglish ? 'match' : 'съвп.'}
                    </span>
                  </div>
                  <div className="suggestion-meta">
                    ⏱ {r.time} {isEnglish ? 'min' : 'мин'} · {displayIngredients.slice(0, 3).join(', ')}{displayIngredients.length > 3 ? '...' : ''}
                  </div>
                  <div className="suggestion-ings">
                    {r.requiredIngredients.map((ing) => {
                      const ingLow = ing.toLowerCase();
                      const inFridge = safeFridge.some((f) => {
                        const fLow = f.name.toLowerCase();
                        const fEn = toEnglish(f.name).toLowerCase();
                        return fLow.includes(ingLow) || ingLow.includes(fLow) ||
                               fEn.includes(ingLow) || ingLow.includes(fEn);
                      });
                      return (
                        <span
                          key={ing}
                          className={`badge ${inFridge ? 'badge-in-fridge' : 'badge-missing'}`}
                        >
                          {inFridge ? '✓' : '+'} {ing}
                        </span>
                      );
                    })}
                  </div>
                  <div className="step-section">
                    <div className="step-section-label">
                      {isEnglish ? 'Steps:' : 'Стъпки:'}
                    </div>
                    {displaySteps.map((s, i) => (
                      <div key={s} className="step-item">
                        {i + 1}. {s}
                      </div>
                    ))}
                  </div>
                  {lang === 'bg' && !r.isAI && r.nameEn != null && r.nameEn !== '' && (
                    <div className="translate-section">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleTranslateCard(r)}
                      >
                        🌐 Преведи на български
                      </button>
                    </div>
                  )}
                  <div className="suggestion-wrap">
                    {(savedIdMap.has(r.id) || savedRecipeByName.has(r.name)) ? (
                      <div className="suggestion-actions suggestion-action-row">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setPendingRemoveSuggestionId(r.id)}
                        >
                          🗑 {isEnglish ? 'Remove' : 'Премахни'}
                        </button>
                        {updateRecipe != null && lang === 'bg' && !r.isAI && r.nameEn != null && r.nameEn !== '' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSaveTranslationFor(r)}
                          >
                            💾 {(() => {
                              const savedId = savedIdMap.get(r.id) ?? savedRecipeByName.get(r.name);
                              const saved = savedId ? recipes.find(rec => rec.id === savedId) : null;
                              return saved?.ingredientsTranslated?.length ? 'Обнови превода' : 'Запази превод';
                            })()}
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={savingId === r.id}
                        onClick={() => handleOpenSaveModal(r)}
                      >
                        {savingId === r.id
                          ? (isEnglish ? 'Saving...' : 'Запазване...')
                          : `💾 ${isEnglish ? 'Save recipe' : 'Запази рецептата'}`}
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
          <div className="suggestions-footer">
            {suggestionSource === 'gemini' && geminiMode && suggestions.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleTryDifferentSuggestions}
                disabled={loadingMoreSuggestions || loadingSuggestions}
              >
                {loadingMoreSuggestions
                  ? (<><span className="spinner" />{isEnglish ? 'Searching...' : 'Търси...'}</>)
                  : `🔄 ${isEnglish ? 'Try different' : 'Опитай различни'}`}
              </button>
            )}
            {suggestionSource === 'api' && !geminiMode && suggestions.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleTryDifferentRecipeApi}
                disabled={loadingMoreSuggestions || loadingSuggestions}
              >
                {loadingMoreSuggestions
                  ? (<><span className="spinner" />{isEnglish ? 'Searching...' : 'Търси...'}</>)
                  : `🔄 ${isEnglish ? 'Try different' : 'Опитай различни'}`}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => { setSuggestions(null); setSuggestionSource(null); }}>
              {isEnglish ? 'Clear' : 'Изчисти'}
            </button>
          </div>
        </div>
      )}

      {(() => {
        const pendingItem = fridge.find(f => f.id === pendingRemoveItemId);
        const matchingProduct = pendingItem
          ? products.find(p => p.name.toLowerCase() === pendingItem.name.toLowerCase())
          : undefined;
        return (
          <Modal open={pendingRemoveItemId !== null} onClose={() => setPendingRemoveItemId(null)} title={isEnglish ? 'Remove item?' : 'Премахване на продукт?'}>
            <p className="modal-confirm-text">
              {isEnglish ? `Remove "${pendingItem?.name}" from fridge?` : `Премахни "${pendingItem?.name}" от хладилника?`}
            </p>
            <div className="stack">
              <div className="row">
                <button className="btn btn-ghost flex-1" onClick={() => setPendingRemoveItemId(null)}>
                  {isEnglish ? 'Cancel' : 'Отказ'}
                </button>
                <button className="btn btn-danger flex-1" onClick={() => { if (pendingRemoveItemId) removeItem(pendingRemoveItemId); setPendingRemoveItemId(null); }}>
                  {isEnglish ? 'Remove from fridge' : 'Само от хладилника'}
                </button>
              </div>
              {matchingProduct && removeProduct && (
                <button className="btn btn-danger" onClick={() => {
                  if (pendingRemoveItemId) removeFridgeItem(pendingRemoveItemId);
                  removeProduct(matchingProduct.id);
                  setPendingRemoveItemId(null);
                  toast.success(isEnglish ? 'Removed from fridge and products' : 'Премахнат от хладилника и продуктите');
                }}>
                  {isEnglish ? 'Remove from fridge & products' : 'Премахни и от продуктите'}
                </button>
              )}
            </div>
          </Modal>
        );
      })()}

      <ConfirmDeleteModal
        open={pendingRemoveSuggestionId !== null}
        itemName={suggestions?.find((r) => r.id === pendingRemoveSuggestionId)?.name ?? ''}
        lang={lang}
        onConfirm={() => {
          if (pendingRemoveSuggestionId) {
            if (savedIdMap.has(pendingRemoveSuggestionId)) {
              unsaveRecipe(pendingRemoveSuggestionId);
            } else {
              const name = suggestions?.find((r) => r.id === pendingRemoveSuggestionId)?.name;
              if (name) {
                const realId = savedRecipeByName.get(name);
                if (realId) removeRecipe(realId);
              }
            }
          }
          setPendingRemoveSuggestionId(null);
        }}
        onCancel={() => setPendingRemoveSuggestionId(null)}
      />

      <Modal
        open={pendingSaveRecipe !== null}
        onClose={() => setPendingSaveRecipe(null)}
        title={isEnglish ? 'Save recipe' : 'Запази рецепта'}
      >
        <p className="modal-confirm-text">
          {isEnglish ? 'Who can see this recipe?' : 'Кой може да види тази рецепта?'}
        </p>
        {saveError && (
          <p className="modal-error">
            {isEnglish ? 'Failed to save. Please try again.' : 'Неуспешно запазване. Опитай отново.'}
          </p>
        )}
        <div className="row">
          <button
            className="btn btn-ghost flex-1"
            disabled={savingId !== null}
            onClick={() => handleSaveWithVisibility(false)}
          >
            🔒 {isEnglish ? 'Only me' : 'Само аз'}
          </button>
          <button
            className="btn btn-primary flex-1"
            disabled={savingId !== null}
            onClick={() => handleSaveWithVisibility(true)}
          >
            🌍 {isEnglish ? 'Everyone' : 'Всички'}
          </button>
        </div>
      </Modal>

      <Modal open={addOpen} onClose={closeAddModal} title={isEnglish ? 'Add to Fridge' : 'Добави в хладилника'}>
        <div className="chip-group mb-4">
          <span
            className={`chip${addMode === 'select' ? ' selected' : ''}`}
            onClick={() => setAddMode('select')}
          >
            {isEnglish ? 'My products' : 'Моите продукти'}
          </span>
          <span
            className={`chip${addMode === 'manual' ? ' selected' : ''}`}
            onClick={() => setAddMode('manual')}
          >
            {isEnglish ? 'Manual' : 'Ръчно'}
          </span>
        </div>

        {addMode === 'select' ? (
          <>
            <div className="modal-section-hd">
              <input
                className="input-field"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={isEnglish ? 'Search products…' : 'Търси продукти…'}
                autoFocus
              />
            </div>
            {filteredProducts.length === 0 ? (
              <div className="modal-select-empty">
                {availableProducts.length === 0
                  ? (isEnglish ? 'All your products are already in the fridge' : 'Всички продукти вече са в хладилника')
                  : (isEnglish ? 'No matching products' : 'Няма съвпадащи продукти')}
              </div>
            ) : (
              <div className="modal-select-list">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    className="btn btn-ghost modal-select-btn"
                    onClick={() => addFromProduct(p)}
                  >
                    <span className="emoji-sm">{p.emoji}</span>
                    <span className="item-name">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
            <button className="btn btn-ghost" onClick={closeAddModal}>{isEnglish ? 'Cancel' : 'Отказ'}</button>
          </>
        ) : (
          <>
            <div className="product-edit-mb">
              <label className="input-label">{isEnglish ? 'Product name' : 'Продукт'}</label>
              <input
                className="input-field"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder={isEnglish ? 'e.g. Tomatoes' : 'напр. Домати'}
                onKeyDown={(e) => e.key === 'Enter' && addItemManually()}
                autoFocus
              />
            </div>
            <div className="product-edit-mb">
              <label className="input-label">{isEnglish ? 'Pick an emoji' : 'Избери емоджи'}</label>
              <div className="chip-group">
                {FRIDGE_EMOJIS.map((e) => (
                  <span
                    key={e}
                    className={`chip chip-emoji${newEmoji === e ? ' selected' : ''}`}
                    onClick={() => setNewEmoji(e)}
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
            <div className="product-edit-mb">
              <label className="input-label">{isEnglish ? 'Category' : 'Категория'}</label>
              <select className="input-field" value={newCategory} onChange={(e) => setNewCategory(e.target.value as FridgeItem['category'])}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {isEnglish ?c.labelEn : c.label}</option>
                ))}
              </select>
            </div>
            <div className="product-edit-mb-lg">
              <label className="input-label">{isEnglish ? 'My relationship with this food' : 'Моето отношение'}</label>
              <div className="chip-group">
                <span className={`chip${newStatus === 'liked' ? ' selected' : ''}`} onClick={() => setNewStatus('liked')}>✓ {isEnglish ? 'I like it' : 'Харесвам'}</span>
                <span className={`chip${newStatus === 'disliked' ? ' sel-warn' : ''}`} onClick={() => setNewStatus('disliked')}>✗ {isEnglish ? 'I dislike it' : 'Не харесвам'}</span>
                <span className={`chip${newStatus === 'allergic' ? ' sel-danger' : ''}`} onClick={() => setNewStatus('allergic')}>⚠ {isEnglish ? 'Allergic' : 'Алергия'}</span>
              </div>
            </div>
            <div className="row">
              <button className="btn btn-primary flex-1" onClick={addItemManually}>{isEnglish ? 'Add' : 'Добави'}</button>
              <button className="btn btn-ghost" onClick={closeAddModal}>{isEnglish ? 'Cancel' : 'Отказ'}</button>
            </div>
          </>
        )}
      </Modal>

      {updateRecipe != null && (
        <SaveTranslationModal
          open={saveTranslationFor !== null}
          lang={lang}
          onConfirm={async (name, ingredients, steps) => {
            if (!saveTranslationFor) return;
            const savedId = savedIdMap.get(saveTranslationFor.id) ?? savedRecipeByName.get(saveTranslationFor.name);
            const savedRecipe = savedId ? recipes.find(r => r.id === savedId) : null;
            if (!savedRecipe) return;
            updateRecipe({ ...savedRecipe, nameTranslated: name, ingredientsTranslated: ingredients, stepsTranslated: steps });
            toast.success(isEnglish ? 'Translation saved!' : 'Преводът е запазен!');
          }}
          onCancel={() => setSaveTranslationFor(null)}
        />
      )}
    </div>
  );
}
