import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { matchFromFridge, type MatchedRecipe } from '../utils/matchFromFridge';
import { searchByFridge, toEnglish } from '../utils/searchTheMealDB';
import { searchWithGemini } from '../utils/searchWithGemini';
import type { FridgeItem, Profile, Recipe, Language, Product } from '../../../shared/types';

const FRIDGE_EMOJIS = ['🥚', '🧀', '🍞', '🧈', '🥛', '🍚', '🍗', '🥔', '🍎', '🍅', '🥕', '🥦', '🧅', '🫙', '📦'];

interface FridgeScreenProps {
  fridge: FridgeItem[];
  addFridgeItem: (item: Omit<FridgeItem, 'id'>) => Promise<void>;
  removeFridgeItem: (id: string) => Promise<void>;
  profile: Profile;
  recipes: Recipe[];
  products: Product[];
  lang: Language;
}

export function FridgeScreen({ fridge, addFridgeItem, removeFridgeItem, profile, recipes, products, lang }: FridgeScreenProps) {
  const L = lang === 'en';
  const [newItem, setNewItem] = useState('');
  const [newEmoji, setNewEmoji] = useState('📦');
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'select' | 'manual'>('select');
  const [productSearch, setProductSearch] = useState('');
  const [suggestions, setSuggestions] = useState<MatchedRecipe[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [geminiMode, setGeminiMode] = useState(false);
  const [fridgeExpanded, setFridgeExpanded] = useState(true);
  const [matchingExpanded, setMatchingExpanded] = useState(false);

  const removeItem = (id: string) => removeFridgeItem(id);

  const openAddModal = () => {
    setAddMode(products.length > 0 ? 'select' : 'manual');
    setProductSearch('');
    setNewItem('');
    setNewEmoji('📦');
    setAddOpen(true);
  };

  const closeAddModal = () => {
    setAddOpen(false);
    setProductSearch('');
    setNewItem('');
    setNewEmoji('📦');
  };

  const addItemManually = async () => {
    if (!newItem.trim()) return;
    await addFridgeItem({ name: newItem.trim(), emoji: newEmoji, category: 'other' });
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
    try {
      if (geminiMode) {
        setSuggestions(filterSafe(await searchWithGemini(safeFridge, blocked, lang)));
      } else {
        const online = filterSafe(await searchByFridge(safeFridge, blocked));
        if (online.length > 0) {
          setSuggestions(online);
        } else {
          setSuggestions(filterSafe(await matchFromFridge(safeFridge, blocked)));
        }
      }
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const matchingRecipes = recipes.filter((r) => {
    const safe = !r.requiredIngredients?.some((i) => blocked.some((b) => i.toLowerCase().includes(b)));
    const hasIngredients = r.requiredIngredients?.some((i) =>
      fridge.some((f) => f.name.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(f.name.toLowerCase())),
    );
    return safe && hasIngredients;
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="row-between">
          <div>
            <div className="page-title">🧊 {L ? 'My Fridge' : 'Моят хладилник'}</div>
            {fridge.length > 0 && (
              <button className="fridge-toggle" onClick={() => setFridgeExpanded((v) => !v)}>
                {fridge.length} {L ? 'items' : 'продукта'} {fridgeExpanded ? '▲' : '▼'}
              </button>
            )}
            {fridge.length === 0 && (
              <div className="page-sub">0 {L ? 'items' : 'продукта'}</div>
            )}
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            + {L ? 'Add' : 'Добави'}
          </button>
        </div>
      </div>

      {fridge.length === 0 ? (
        <EmptyState
          icon="🧊"
          title={L ? 'Empty fridge' : 'Празен хладилник'}
          subtitle={L ? 'Add what you have at home' : 'Добави какво имаш у дома'}
        />
      ) : fridgeExpanded && (
        <div className="stack" style={{ marginBottom: 20 }}>
          {fridge.map((item) => (
            <div key={item.id} className="fridge-item">
              <span className="fridge-emoji">{item.emoji}</span>
              <span className="fridge-name">{item.name}</span>
              <button className="btn btn-danger btn-sm" onClick={() => removeItem(item.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {matchingRecipes.length > 0 && (
        <>
          <button className="section-title-toggle" onClick={() => setMatchingExpanded((v) => !v)}>
            {L ? 'RECIPES FROM WHAT YOU HAVE' : 'РЕЦЕПТИ ОТ НАЛИЧНИ ПРОДУКТИ'}
            <span className="section-title-chevron">{matchingExpanded ? '▲' : '▼'}</span>
          </button>
          {matchingExpanded && (
            <div className="stack" style={{ marginBottom: 20 }}>
              {matchingRecipes.map((r) => (
                <div key={r.id} className="card-sm row">
                  <span style={{ fontSize: 24 }}>{r.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{L && r.nameEn ? r.nameEn : r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>⏱ {r.time} {L ? 'min' : 'мин'}</div>
                  </div>
                  <Badge type="safe">✓ {L ? 'Safe' : 'Безопасно'}</Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="divider" />
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          {geminiMode ? (L ? '✨ AI SUGGESTIONS' : '✨ ИИ ПРЕДЛОЖЕНИЯ') : (L ? 'RECIPE SUGGESTIONS' : 'ПРЕДЛОЖЕНИЯ ОТ БАЗАТА')}
        </div>
        <div className="toggle-wrap">
          <span className={`toggle-label${geminiMode ? ' active' : ''}`}>Gemini AI</span>
          <label className="toggle">
            <input type="checkbox" checked={geminiMode} onChange={(e) => setGeminiMode(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 14, fontWeight: 600 }}>
        {geminiMode
          ? (L ? 'Ask Gemini AI to suggest recipes from your fridge.' : 'Попитай Gemini ИИ за рецепти от хладилника.')
          : (L ? 'Find recipes that match what you have at home.' : 'Намери рецепти спрямо наличните продукти и твоите ограничения.')}
      </p>
      <button
        className="btn btn-primary btn-full"
        onClick={handleWhatCanICook}
        disabled={fridge.length === 0 || loadingSuggestions}
      >
        {loadingSuggestions
          ? (<><span className="spinner" />{L ? 'Searching...' : 'Търси...'}</>)
          : geminiMode
            ? `✨ ${L ? 'Ask Gemini' : 'Попитай Gemini'}`
            : `🔍 ${L ? 'What can I cook?' : 'Какво мога да готвя?'}`}
      </button>

      {suggestions !== null && (
        <div style={{ marginTop: 16 }}>
          {blockedFridgeItems.length > 0 && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: 'var(--text2)', marginRight: 6 }}>
                🚫 {L ? 'Excluded from search:' : 'Изключено от търсенето:'}
              </span>
              {blockedFridgeItems.map((item) => (
                <span
                  key={item.id}
                  className="badge"
                  style={{
                    marginRight: 4,
                    background: item.reason === 'allergic' ? 'var(--danger-light, #fdecea)' : 'var(--warn-light, #fff8e1)',
                    color: item.reason === 'allergic' ? 'var(--danger)' : 'var(--warn)',
                    border: `1px solid ${item.reason === 'allergic' ? 'var(--danger)' : 'var(--warn)'}`,
                  }}
                >
                  {item.emoji} {item.name} · {item.reason === 'allergic' ? (L ? 'allergic' : 'алергия') : (L ? 'disliked' : 'нелюбимо')}
                </span>
              ))}
            </div>
          )}
          {suggestions.length === 0 ? (
            <EmptyState
              icon="😔"
              title={L ? 'No matches found' : 'Няма съвпадения'}
              subtitle={L ? 'Try adding more items to your fridge' : 'Добави повече продукти в хладилника'}
            />
          ) : (
            <div className="stack">
              {suggestions.map((r) => (
                <div key={r.id} className="card-sm" style={{ borderLeft: `3px solid ${r.isAI ? 'var(--secondary)' : 'var(--primary)'}` }}>
                  <div className="row-between" style={{ marginBottom: 6 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{r.emoji}</span>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{r.name}</span>
                      {r.isAI && <span className="badge badge-neutral" style={{ fontSize: 11 }}>✨ AI</span>}
                    </div>
                    <span className="badge badge-safe">
                      {r.matchedCount}/{r.requiredIngredients.length} {L ? 'match' : 'съвп.'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
                    ⏱ {r.time} {L ? 'min' : 'мин'} · {r.ingredients.slice(0, 3).join(', ')}{r.ingredients.length > 3 ? '...' : ''}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
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
                          className="badge"
                          style={{
                            background: inFridge ? 'var(--secondary-light)' : 'var(--bg)',
                            color: inFridge ? 'var(--secondary)' : 'var(--text2)',
                            border: `1px solid ${inFridge ? 'var(--secondary-light)' : 'var(--border)'}`,
                          }}
                        >
                          {inFridge ? '✓' : '+'} {ing}
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>
                      {L ? 'Steps:' : 'Стъпки:'}
                    </div>
                    {r.steps.map((s, i) => (
                      <div key={i} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', paddingLeft: 4, marginBottom: 2 }}>
                        {i + 1}. {s}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setSuggestions(null)}>
            {L ? 'Clear' : 'Изчисти'}
          </button>
        </div>
      )}

      <Modal open={addOpen} onClose={closeAddModal} title={L ? 'Add to Fridge' : 'Добави в хладилника'}>
        <div className="chip-group" style={{ marginBottom: 16 }}>
          <span
            className={`chip${addMode === 'select' ? ' selected' : ''}`}
            onClick={() => setAddMode('select')}
          >
            {L ? 'My products' : 'Моите продукти'}
          </span>
          <span
            className={`chip${addMode === 'manual' ? ' selected' : ''}`}
            onClick={() => setAddMode('manual')}
          >
            {L ? 'Manual' : 'Ръчно'}
          </span>
        </div>

        {addMode === 'select' ? (
          <>
            <div style={{ marginBottom: 10 }}>
              <input
                className="input-field"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={L ? 'Search products…' : 'Търси продукти…'}
                autoFocus
              />
            </div>
            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 14, padding: '16px 0', marginBottom: 14 }}>
                {availableProducts.length === 0
                  ? (L ? 'All your products are already in the fridge' : 'Всички продукти вече са в хладилника')
                  : (L ? 'No matching products' : 'Няма съвпадащи продукти')}
              </div>
            ) : (
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    className="btn btn-ghost"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start', textAlign: 'left' }}
                    onClick={() => addFromProduct(p)}
                  >
                    <span style={{ fontSize: 20 }}>{p.emoji}</span>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                  </button>
                ))}
              </div>
            )}
            <button className="btn btn-ghost" onClick={closeAddModal}>{L ? 'Cancel' : 'Отказ'}</button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label className="input-label">{L ? 'Product name' : 'Продукт'}</label>
              <input
                className="input-field"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder={L ? 'e.g. Tomatoes' : 'напр. Домати'}
                onKeyDown={(e) => e.key === 'Enter' && addItemManually()}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="input-label">{L ? 'Pick an emoji' : 'Избери емоджи'}</label>
              <div className="chip-group">
                {FRIDGE_EMOJIS.map((e) => (
                  <span
                    key={e}
                    className={`chip${newEmoji === e ? ' selected' : ''}`}
                    style={{ fontSize: 20, padding: '4px 8px' }}
                    onClick={() => setNewEmoji(e)}
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={addItemManually}>{L ? 'Add' : 'Добави'}</button>
              <button className="btn btn-ghost" onClick={closeAddModal}>{L ? 'Cancel' : 'Отказ'}</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
