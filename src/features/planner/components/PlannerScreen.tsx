import { useState, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { ConfirmDeleteModal } from '../../../shared/components/ConfirmDeleteModal';
import { Modal } from '../../../shared/components/Modal';
import { RecipeDetailView } from '../../../shared/components/RecipeDetailView';
import type { Recipe, FridgeItem, Product, Profile, Language } from '../../../shared/types';
import { planWithGemini } from '../utils/planWithGemini';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { recipeDisplayName, localizeMealTag } from '../../../shared/utils/recipeDisplayName';
import './PlannerScreen.css';

type PlannerData = Record<string, Record<string, string>>;
type MealId = 'breakfast' | 'lunch' | 'dinner';
type DrawerFilter = 'all' | MealId;
// Which recipe source the drawer list is showing: the user's own recipes,
// recipes they favorited (others'), or everything.
type RecipeSource = 'mine' | 'favorites' | 'all';

interface PickerTarget {
  day: number;
  meal: MealId;
}

interface ShoppingItem {
  base: string;
  recipes: string[];
  lines: string[];
  inFridge: boolean;
}

// ── Constants (outside component to avoid recreation on every render) ──────────

const DAY_NAMES_BG = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя'];
const DAY_NAMES_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS_BG = ['ЯН', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ЮНИ', 'ЮЛИ', 'АВГ', 'СЕП', 'ОКТ', 'НОЕ', 'ДЕК'];
const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const MEALS: { id: MealId; bg: string; en: string }[] = [
  { id: 'breakfast', bg: 'Закуска', en: 'Breakfast' },
  { id: 'lunch',     bg: 'Обяд',    en: 'Lunch'     },
  { id: 'dinner',    bg: 'Вечеря',  en: 'Dinner'    },
];

// Maps drawer filter ID → Bulgarian recipe tag for matching
const MEAL_TAG_BG: Record<string, string> = {
  breakfast: 'закуска',
  lunch: 'обяд',
  dinner: 'вечеря',
};

const MEALS_TOTAL = 21;

const ALL_SLOT_KEYS = Array.from({ length: 7 }, (_, d) => MEALS.map(m => `${d}_${m.id}`)).flat();

// Which meal slots Gemini is allowed to fill, shown as the scope chips + used
// in the "Replace all …?" confirm copy.
const SCOPE_LABELS: Record<DrawerFilter, { chip: { en: string; bg: string }; target: { en: string; bg: string } }> = {
  all:       { chip: { en: 'All',       bg: 'Всички'  }, target: { en: 'the whole week', bg: 'цялата седмица' } },
  breakfast: { chip: { en: 'Breakfast', bg: 'Закуска' }, target: { en: 'all breakfasts', bg: 'всички закуски' } },
  lunch:     { chip: { en: 'Lunch',     bg: 'Обяд'    }, target: { en: 'all lunches',    bg: 'всички обеди'  } },
  dinner:    { chip: { en: 'Dinner',    bg: 'Вечеря'  }, target: { en: 'all dinners',    bg: 'всички вечери' } },
};

const SCOPE_ORDER: DrawerFilter[] = ['all', 'breakfast', 'lunch', 'dinner'];

// Pure application of a Gemini plan onto the existing planner, honoring the
// meal scope and merge/overwrite mode. Extracted + exported so the scope
// behavior can be unit-tested without going through the edge function.
//
// Key rule: suggestions are kept as long as they are still placed somewhere.
// Planning one meal type must NOT discard suggestions sitting in another — e.g.
// filling dinner keeps the breakfasts Gemini already made.
export const applyGeminiPlan = (
  planner: PlannerData,
  weekKey: string,
  plan: Record<string, string>,
  planScope: DrawerFilter,
  overwrite: boolean,
  transientRecipes: Recipe[],
  newRecipes: Recipe[],
): { nextPlanner: PlannerData; nextTransient: Recipe[] } => {
  const weekData = planner[weekKey] ?? {};
  const inScope = (slot: string) => planScope === 'all' || slot.endsWith(`_${planScope}`);

  let nextWeek: Record<string, string>;
  if (overwrite && planScope === 'all') {
    nextWeek = { ...plan };
  } else if (overwrite) {
    // Replace just this meal type: clear its slots, then fill from the plan.
    nextWeek = Object.fromEntries(Object.entries(weekData).filter(([slot]) => !inScope(slot)));
    for (const [slot, id] of Object.entries(plan)) {
      if (inScope(slot)) nextWeek[slot] = id;
    }
  } else {
    // Fill only the empty in-scope slots, leaving everything else as-is.
    nextWeek = { ...weekData };
    for (const [slot, id] of Object.entries(plan)) {
      if (inScope(slot) && !nextWeek[slot]) nextWeek[slot] = id;
    }
  }

  const nextPlanner: PlannerData = { ...planner, [weekKey]: nextWeek };

  const referencedIds = new Set(Object.values(nextPlanner).flatMap(week => Object.values(week)));
  const keptSuggestions = transientRecipes.filter(r => referencedIds.has(r.id));
  const addedSuggestions = newRecipes.filter(r => referencedIds.has(r.id));

  return { nextPlanner, nextTransient: [...keptSuggestions, ...addedSuggestions] };
};

// ── PickerModal ────────────────────────────────────────────────────────────────

interface PickerModalProps {
  recipes: Recipe[];
  lang: Language;
  blocked: string[];
  dayName: string;
  mealName: string;
  onClose: () => void;
  onPick: (id: string) => void;
}

const PickerModal = ({ recipes, lang, blocked, dayName, mealName, onClose, onPick }: PickerModalProps) => {
  const isEn = lang === 'en';
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return recipes.filter(r => {
      const name = ((isEn ? r.nameEn : r.name) ?? r.name).toLowerCase();
      return !ql || name.includes(ql);
    });
  }, [recipes, q, isEn]);

  return (
    <Modal open onClose={onClose} contentClassName="picker-modal">
      <div className="picker-modal-label">{dayName} · {mealName}</div>
      <div className="picker-modal-title">{isEn ? 'Pick a recipe' : 'Избери рецепта'}</div>
      <div className="picker-modal-sub">
        {isEn ? 'Or drag one from the side panel.' : 'Или дръпни от страничния панел.'}
      </div>
      <div className="picker-modal-search">
        <input
          className="input"
          autoFocus
          placeholder={isEn ? 'Search recipes…' : 'Търси рецепти…'}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      <div className="picker-list">
        {filtered.map(r => {
          const flagged = r.requiredIngredients?.some(i =>
            blocked.some(b => i.toLowerCase().includes(b.toLowerCase()))
          );
          return (
            <button
              key={r.id}
              className={`picker-recipe${flagged === true ? ' flagged' : ''}`}
              onClick={() => onPick(r.id)}
            >
              <div className="drawer-recipe-emoji">
                <span className="drawer-recipe-emoji-char">{r.emoji}</span>
              </div>
              <div className="drawer-recipe-text">
                <div className="drawer-recipe-name">{isEn && r.nameEn != null ? r.nameEn : r.name}</div>
                <div className="drawer-recipe-meta">
                  {r.time} {isEn ? 'MIN' : 'МИН'} · {localizeMealTag(r.tags?.[0], isEn, isEn ? 'recipe' : 'рецепта')}
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="picker-empty">{isEn ? 'Nothing matches.' : 'Нищо не намерихме.'}</div>
        )}
      </div>
    </Modal>
  );
};

// ── ShoppingModal ──────────────────────────────────────────────────────────────

interface ShoppingModalProps {
  items: ShoppingItem[];
  missingCount: number;
  haveCount: number;
  mealsPlanned: number;
  weekRange: string;
  lang: Language;
  onClose: () => void;
}

const ShoppingModal = ({ items, missingCount, haveCount, mealsPlanned, weekRange, lang, onClose }: ShoppingModalProps) => {
  const isEn = lang === 'en';
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [activeTab, setActiveTab] = useState<'buy' | 'have'>('buy');

  const toggle = useCallback((key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const visible = items.filter(i => activeTab === 'buy' ? !i.inFridge : i.inFridge);

  const copyList = useCallback(() => {
    const lines = items
      .filter(i => !i.inFridge)
      .map(i => {
        const count = i.recipes.length;
        const word = isEn
          ? (count === 1 ? 'recipe' : 'recipes')
          : (count === 1 ? 'рецепта' : 'рецепти');
        return `· ${i.base} — ${count} ${word}`;
      });
    const text = [
      `${isEn ? 'Shopping list' : 'Списък за пазар'} · ${weekRange}`,
      `${isEn ? `For ${mealsPlanned} planned meals` : `За ${mealsPlanned} хранения`}`,
      '',
      ...lines,
    ].join('\n');
    try { navigator.clipboard.writeText(text); } catch { /* clipboard unavailable in some contexts */ }
  }, [items, isEn, weekRange, mealsPlanned]);

  return (
    <Modal open onClose={onClose} contentClassName="shopping-modal">
      <div className="picker-modal-label">{weekRange}</div>
      <div className="picker-modal-title">{isEn ? 'Shopping list' : 'Списък за пазар'}</div>
      <div className="shop-modal-sub">
        {isEn
          ? `${mealsPlanned} planned meals · ${missingCount} to buy · ${haveCount} already on your shelves.`
          : `${mealsPlanned} планирани хранения · ${missingCount} за пазар · ${haveCount} вече на рафта.`}
      </div>
      <div className="shop-modal-tabs">
        <button
          className={`shop-modal-tab${activeTab === 'buy' ? ' on' : ''}`}
          onClick={() => setActiveTab('buy')}
        >
          {isEn ? 'To buy' : 'За пазар'} · {missingCount}
        </button>
        <button
          className={`shop-modal-tab${activeTab === 'have' ? ' on' : ''}`}
          onClick={() => setActiveTab('have')}
        >
          {isEn ? 'On shelves' : 'На рафта'} · {haveCount}
        </button>
      </div>
      {visible.length === 0 ? (
        <div className="planner-empty-state">
          <div className="planner-empty-state-title">
            {activeTab === 'buy'
              ? (isEn ? 'Nothing to buy.' : 'Нищо за купуване.')
              : (isEn ? 'Nothing matched yet.' : 'Все още нищо.')}
          </div>
          <div className="planner-empty-state-sub">
            {activeTab === 'buy'
              ? (isEn ? 'Your fridge already has what you need.' : 'Хладилникът ти има всичко необходимо.')
              : (isEn ? 'Stock the fridge to see matches here.' : 'Зареди хладилника, за да видиш съвпадения.')}
          </div>
        </div>
      ) : (
        <div className="shop-modal-list">
          {visible.map(item => (
            <div
              key={item.base}
              className={[
                'shop-modal-row',
                item.inFridge ? 'in-fridge' : '',
                checked.has(item.base) ? 'checked' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => { if (!item.inFridge) toggle(item.base); }}
            >
              <div className="shop-modal-check">
                {item.inFridge || checked.has(item.base) ? '✓' : ''}
              </div>
              <div className="shop-modal-name">{item.base}</div>
              <div className="shop-modal-recipes">
                {item.recipes.length}×{' '}
                {isEn
                  ? (item.recipes.length === 1 ? 'recipe' : 'recipes')
                  : (item.recipes.length === 1 ? 'рецепта' : 'рецепти')}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="shop-modal-footer">
        <button className="btn btn-secondary btn-sm" onClick={onClose}>
          {isEn ? 'Close' : 'Затвори'}
        </button>
        <button className="btn btn-primary btn-sm" onClick={copyList} disabled={missingCount === 0}>
          {isEn ? 'Copy list' : 'Копирай'}
        </button>
      </div>
    </Modal>
  );
};

// ── PlannerScreen ──────────────────────────────────────────────────────────────

export interface PlannerScreenProps {
  recipes: Recipe[];
  fridge: FridgeItem[];
  products: Product[];
  profile: Profile;
  lang: Language;
  planner: PlannerData;
  setPlanner: Dispatch<SetStateAction<PlannerData>>;
  favoriteRecipes: Recipe[];
  onSaveSuggestion?: (recipe: Recipe) => void;
  onViewRecipe?: (id: string) => void;
  onDeleteRecipe?: (id: string) => void;
}

export const PlannerScreen = ({ recipes, fridge, products = [], profile, lang, planner, setPlanner, favoriteRecipes = [], onSaveSuggestion, onViewRecipe, onDeleteRecipe }: PlannerScreenProps) => {
  const isEn = lang === 'en';

  const blocked = useMemo(() => [
    ...profile.allergies,
    ...profile.dislikes,
    ...products.filter(p => p.status === 'allergic').flatMap(p => p.nameEn ? [p.name, p.nameEn] : [p.name]),
    ...products.filter(p => p.status === 'disliked').flatMap(p => p.nameEn ? [p.name, p.nameEn] : [p.name]),
  ], [profile.allergies, profile.dislikes, products]);

  const liked = useMemo(() =>
    products.filter(p => p.status === 'liked').flatMap(p => p.nameEn ? [p.name, p.nameEn] : [p.name]),
    [products],
  );

  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const d = new Date();
    const dow = (d.getDay() + 6) % 7; // normalize so Mon=0, Sun=6
    d.setDate(d.getDate() - dow + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  // Bug fix: build local ISO string instead of using toISOString() which converts
  // to UTC and can return the wrong date for users west of UTC+0 at midnight.
  const weekKey = useMemo(() => {
    const y = weekStart.getFullYear();
    const m = String(weekStart.getMonth() + 1).padStart(2, '0');
    const d = String(weekStart.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [weekStart]);

  const days = useMemo(() => {
    const months = isEn ? MONTHS_EN : MONTHS_BG;
    const names = isEn ? DAY_NAMES_EN : DAY_NAMES_BG;
    const todayStr = new Date().toDateString();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return {
        idx: i,
        name: names[i],
        dateLabel: `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`,
        isToday: d.toDateString() === todayStr,
      };
    });
  }, [weekStart, isEn]);

  const weekData = useMemo(() => planner[weekKey] ?? {}, [planner, weekKey]);

  const setSlot = useCallback((dayIdx: number, mealId: string, recipeId: string) => {
    setPlanner({ ...planner, [weekKey]: { ...weekData, [`${dayIdx}_${mealId}`]: recipeId } });
  }, [planner, weekKey, weekData, setPlanner]);

  const clearSlot = useCallback((dayIdx: number, mealId: string) => {
    const next = { ...weekData };
    delete next[`${dayIdx}_${mealId}`];
    setPlanner({ ...planner, [weekKey]: next });
  }, [planner, weekKey, weekData, setPlanner]);

  const clearScope = useCallback((scope: DrawerFilter) => {
    if (scope === 'all') {
      setPlanner({ ...planner, [weekKey]: {} });
      return;
    }
    const next = Object.fromEntries(
      Object.entries(weekData).filter(([slot]) => !slot.endsWith(`_${scope}`)),
    );
    setPlanner({ ...planner, [weekKey]: next });
  }, [planner, weekKey, weekData, setPlanner]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragSourceSlot, setDragSourceSlot] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<PickerTarget | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState('');
  const [drawerFilter, setDrawerFilter] = useState<DrawerFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<RecipeSource>('mine');
  const [previewSuggestion, setPreviewSuggestion] = useState<Recipe | null>(null);
  const [pendingDeleteRecipeId, setPendingDeleteRecipeId] = useState<string | null>(null);
  const pendingDeleteRecipe = recipes.find(r => r.id === pendingDeleteRecipeId);
  const [planScope, setPlanScope] = useState<DrawerFilter>('all');

  // Recipes the user can pick from: their own recipes + favorites (deduped).
  // `recipes` is already scoped to the signed-in user, so include all of them —
  // filtering by authorEmail here would hide a user's own recipes that happen to
  // have no email stored.
  const pickableRecipes = useMemo(() => {
    const seen = new Set<string>();
    const result: Recipe[] = [];
    for (const r of [...recipes, ...favoriteRecipes]) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        result.push(r);
      }
    }
    return result;
  }, [recipes, favoriteRecipes]);

  // Gemini can reuse existing recipes or invent fresh ones from the fridge and
  // products, so planning is meaningful whenever any of those exist — not only
  // when the user has authored their own recipes.
  const canPlanWithGemini = pickableRecipes.length > 0 || fridge.length > 0 || products.length > 0;

  // Shared search + meal-tag predicate so the saved-recipe list and the Gemini
  // suggestions group filter identically.
  const matchesDrawer = useCallback((r: Recipe) => {
    const q = drawerQuery.toLowerCase().trim();
    const name = ((isEn ? r.nameEn : r.name) ?? r.name).toLowerCase();
    if (q && !name.includes(q)) return false;
    if (drawerFilter === 'all') return true;
    // Support both BG tags (stored in DB) and EN drawer filter IDs
    const tagBg = MEAL_TAG_BG[drawerFilter];
    return r.tags?.some(tag => {
      const t = tag.toLowerCase();
      return t === tagBg || t === drawerFilter;
    }) ?? false;
  }, [drawerQuery, drawerFilter, isEn]);

  // Ids of the user's own recipes, so the source toggle can tell "mine" apart
  // from favorited (others') recipes within the merged pickable list.
  const mineIds = useMemo(() => new Set(recipes.map(r => r.id)), [recipes]);

  // The Mine/Favorites toggle is only worth showing once the user has favorited
  // a recipe that isn't already their own — otherwise every segment is identical.
  const hasFavoriteRecipes = useMemo(() => pickableRecipes.some(r => !mineIds.has(r.id)), [pickableRecipes, mineIds]);

  const matchesSource = useCallback((r: Recipe) => {
    // When the toggle isn't shown (no favorites), don't filter — otherwise a
    // sourceFilter left on 'favorites' would empty the drawer with no chip to
    // switch back to 'mine'.
    if (sourceFilter === 'all' || !hasFavoriteRecipes) return true;
    const isMine = mineIds.has(r.id);
    return sourceFilter === 'mine' ? isMine : !isMine;
  }, [sourceFilter, hasFavoriteRecipes, mineIds]);

  const filteredRecipes = useMemo(
    () => pickableRecipes.filter(r => matchesSource(r) && matchesDrawer(r)),
    [pickableRecipes, matchesSource, matchesDrawer],
  );

  // Gemini-suggested recipes stored transiently (not saved to DB)
  const [transientRecipes, setTransientRecipes] = useLocalStorage<Recipe[]>('kdq_planner_transient', []);

  // Full pool for slot lookup — own recipes, favorites, and transient Gemini
  // suggestions. Favorites must be here or a dragged-in favorite resolves to
  // nothing and the slot renders empty.
  const allRecipes = useMemo(() => [...recipes, ...favoriteRecipes, ...transientRecipes], [recipes, favoriteRecipes, transientRecipes]);

  const filteredSuggestions = useMemo(() => transientRecipes.filter(matchesDrawer), [transientRecipes, matchesDrawer]);

  const suggestionIds = useMemo(() => new Set(transientRecipes.map(r => r.id)), [transientRecipes]);

  // Strip a set of recipe ids out of every week's plan — used when a suggestion
  // is discarded so no slot is left pointing at a recipe that no longer exists.
  const removeIdsFromPlanner = useCallback((ids: Set<string>) => {
    setPlanner(prev => {
      const next: PlannerData = {};
      for (const [wk, slots] of Object.entries(prev)) {
        next[wk] = Object.fromEntries(Object.entries(slots).filter(([, id]) => !ids.has(id)));
      }
      return next;
    });
  }, [setPlanner]);

  // Save a suggestion as a real recipe, then drop it from the transient list so
  // it stops showing as a suggestion (its slots keep working — the id is reused).
  const saveSuggestion = useCallback((recipe: Recipe) => {
    onSaveSuggestion?.(recipe);
    setTransientRecipes(prev => prev.filter(r => r.id !== recipe.id));
  }, [onSaveSuggestion, setTransientRecipes]);

  const removeSuggestion = useCallback((id: string) => {
    setTransientRecipes(prev => prev.filter(r => r.id !== id));
    removeIdsFromPlanner(new Set([id]));
  }, [setTransientRecipes, removeIdsFromPlanner]);

  const clearSuggestions = useCallback(() => {
    removeIdsFromPlanner(new Set(transientRecipes.map(r => r.id)));
    setTransientRecipes([]);
  }, [removeIdsFromPlanner, transientRecipes, setTransientRecipes]);

  const assignedIds = useMemo(() => Object.values(weekData).filter(id => id !== ''), [weekData]);

  // Bug fix: use type predicate to narrow (Recipe | undefined)[] → Recipe[]
  const assignedRecipes = useMemo(() =>
    assignedIds
      .map(id => allRecipes.find(r => r.id === id))
      .filter((r): r is Recipe => r != null),
    [assignedIds, allRecipes],
  );

  const mealsPlanned = assignedRecipes.length;
  const uniqueRecipeCount = useMemo(() => new Set(assignedRecipes.map(r => r.id)).size, [assignedRecipes]);

  const [planningLoading, setPlanningLoading] = useState(false);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);

  const doGeminiPlan = useCallback(async (overwrite: boolean) => {
    if (!canPlanWithGemini) return;
    setPlanningLoading(true);
    try {
      const scheduledNames = assignedRecipes.map(r => isEn && r.nameEn != null ? r.nameEn : r.name);
      const { plan, newRecipes } = await planWithGemini(recipes, fridge, products, blocked, liked, profile.dietaryPrefs, lang, scheduledNames);
      if (Object.keys(plan).length === 0) return;

      const { nextPlanner, nextTransient } = applyGeminiPlan(
        planner, weekKey, plan, planScope, overwrite, transientRecipes, newRecipes,
      );
      setTransientRecipes(nextTransient);
      setPlanner(nextPlanner);
    } finally {
      setPlanningLoading(false);
    }
  }, [canPlanWithGemini, recipes, fridge, products, blocked, liked, profile.dietaryPrefs, lang, assignedRecipes, isEn, planner, weekKey, planScope, setPlanner, transientRecipes, setTransientRecipes]);

  const handlePlanWithGemini = useCallback(() => {
    const scopeSlots = planScope === 'all' ? ALL_SLOT_KEYS : ALL_SLOT_KEYS.filter(s => s.endsWith(`_${planScope}`));
    const emptyInScope = scopeSlots.filter(s => !weekData[s]).length;
    if (emptyInScope === 0) {
      setOverwriteConfirmOpen(true);
    } else {
      doGeminiPlan(false);
    }
  }, [planScope, weekData, doGeminiPlan]);

  const fridgeNames = useMemo(() => fridge.map(f => f.name.toLowerCase()), [fridge]);

  const shoppingItems = useMemo<ShoppingItem[]>(() => {
    const byBase = new Map<string, { base: string; recipes: Set<string>; lines: Set<string> }>();

    assignedRecipes.forEach(r => {
      r.requiredIngredients?.forEach(base => {
        const key = base.toLowerCase();
        if (!byBase.has(key)) {
          byBase.set(key, { base, recipes: new Set(), lines: new Set() });
        }
        const entry = byBase.get(key)!;
        entry.recipes.add(isEn && r.nameEn != null ? r.nameEn : r.name);

        // Bug fix: find the full ingredient line by string match, not by index —
        // requiredIngredients and ingredients arrays are not index-aligned.
        const bl = base.toLowerCase();
        const line = r.ingredients?.find(l => l.toLowerCase().includes(bl));
        if (line != null) entry.lines.add(line);
      });
    });

    return Array.from(byBase.values())
      .map(item => {
        const k = item.base.toLowerCase();
        const inFridge = fridgeNames.some(fn => fn.includes(k) || k.includes(fn));
        return { base: item.base, recipes: [...item.recipes], lines: [...item.lines], inFridge };
      })
      .sort((a, b) => Number(a.inFridge) - Number(b.inFridge) || a.base.localeCompare(b.base));
  }, [assignedRecipes, fridgeNames, isEn]);

  const missingCount = shoppingItems.filter(i => !i.inFridge).length;
  const haveCount = shoppingItems.filter(i => i.inFridge).length;

  const weekRange = useMemo(() => {
    const months = isEn ? MONTHS_EN : MONTHS_BG;
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return `${weekStart.getDate()} ${months[weekStart.getMonth()]} → ${end.getDate()} ${months[end.getMonth()]}`;
  }, [weekStart, isEn]);

  const handleSampleWeek = useCallback(() => {
    if (recipes.length === 0) return;
    const get = (i: number) => recipes[i % recipes.length].id;
    setPlanner({
      ...planner,
      [weekKey]: {
        '0_breakfast': get(0), '0_lunch': get(1), '0_dinner': get(3),
        '1_breakfast': get(2), '1_dinner': get(5),
        '2_breakfast': get(4), '2_lunch': get(1),
        '3_breakfast': get(0), '3_dinner': get(3),
        '4_breakfast': get(2), '4_lunch': get(5),
        '5_breakfast': get(4), '5_dinner': get(1),
        '6_breakfast': get(0),
      },
    });
  }, [recipes, planner, weekKey, setPlanner]);

  return (
    <div className="fade-in">
      <div className="topbar">
        <div className="breadcrumb">
          {isEn ? 'Kitchen' : 'Кухня'}{' '}
          <span>/ {isEn ? 'The week ahead' : 'Седмицата напред'}</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-xs" onClick={() => setWeekOffset(w => w - 1)}>
            ← {isEn ? 'Prev' : 'Пред.'}
          </button>
          <button
            className={`btn btn-secondary btn-xs${weekOffset === 0 ? ' planner-btn-dimmed' : ''}`}
            onClick={() => setWeekOffset(0)}
          >
            {isEn ? 'This week' : 'Тази седмица'}
          </button>
          <button className="btn btn-secondary btn-xs" onClick={() => setWeekOffset(w => w + 1)}>
            {isEn ? 'Next' : 'Следв.'} →
          </button>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow">{isEn ? 'A week at the table' : 'Седмица на масата'}</div>
          <h1 className="h-title">
            <span className="italic">{isEn ? 'Planner' : 'Седмица'}</span>
          </h1>
          <div className="page-head-sub">
            {isEn
              ? 'Drag a recipe onto any meal slot. When the week is set, the shopping list assembles itself.'
              : 'Дръпни рецепта в свободна клетка. Когато седмицата е готова, списъкът за пазар се сглобява сам.'}
          </div>
        </div>
        <div className="planner-head-right">
          <span className="label">{weekRange}</span>
          <div className="planner-head-btns">
            {mealsPlanned === 0 && recipes.length > 0 && (
              <button className="btn btn-secondary btn-xs" onClick={handleSampleWeek}>
                {isEn ? 'Try a sample week' : 'Пробвай примерна седмица'}
              </button>
            )}
            {canPlanWithGemini && (
              <button
                className="btn btn-secondary btn-xs"
                onClick={handlePlanWithGemini}
                disabled={planningLoading}
              >
                {planningLoading
                  ? <><span className="spinner" />{isEn ? 'Planning…' : 'Планира…'}</>
                  : `✨ ${isEn ? 'Plan with Gemini' : 'Планирай с Gemini'}`}
              </button>
            )}
          </div>
          {canPlanWithGemini && (
            <div className="plan-scope">
              <span className="plan-scope-label">{isEn ? 'Gemini fills' : 'Gemini попълва'}</span>
              <div className="plan-scope-chips">
                {SCOPE_ORDER.map(scope => (
                  <button
                    key={scope}
                    className={`drawer-chip${planScope === scope ? ' on' : ''}`}
                    onClick={() => setPlanScope(scope)}
                  >
                    {isEn ? SCOPE_LABELS[scope].chip.en : SCOPE_LABELS[scope].chip.bg}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mealsPlanned > 0 && (
            <div className="plan-scope">
              <span className="plan-scope-label">{isEn ? 'Clear' : 'Изчисти'}</span>
              <div className="plan-scope-chips">
                {SCOPE_ORDER.map(scope => (
                  <button
                    key={scope}
                    className="drawer-chip plan-scope-reset"
                    onClick={() => clearScope(scope)}
                  >
                    {isEn ? SCOPE_LABELS[scope].chip.en : SCOPE_LABELS[scope].chip.bg}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="week-metrics">
        <div className="week-metric">
          <div className="week-metric-num italic clay">
            {mealsPlanned}
            <span className="week-metric-fraction"> / {MEALS_TOTAL}</span>
          </div>
          <div className="week-metric-label">{isEn ? 'Meals planned' : 'Планирани хранения'}</div>
        </div>
        <div className="week-metric">
          <div className="week-metric-num italic">{uniqueRecipeCount}</div>
          <div className="week-metric-label">{isEn ? 'Unique recipes' : 'Уникални рецепти'}</div>
        </div>
        <div className="week-metric">
          <div className="week-metric-num italic amber">{missingCount}</div>
          <div className="week-metric-label">{isEn ? 'To buy' : 'За пазар'}</div>
        </div>
        <div className="week-metric">
          <div className="week-metric-num italic moss">{haveCount}</div>
          <div className="week-metric-label">{isEn ? 'Already on shelves' : 'Вече на рафта'}</div>
        </div>
      </div>

      <div className="planner-stage">
        <div>
          <div className="section-eyebrow">
            <span className="label">{isEn ? 'Mon → Sun' : 'Пон → Нед'}</span>
          </div>
          <div className="planner-week">
            {days.map(day => (
              <div key={day.idx} className={`planner-day${day.isToday ? ' today' : ''}`}>
                <div className="day-label">
                  <div className="day-name">{day.name}</div>
                  <div className="day-date">
                    {day.dateLabel}{day.isToday ? ` · ${isEn ? 'TODAY' : 'ДНЕС'}` : ''}
                  </div>
                </div>
                <div className="day-meals">
                  {MEALS.map(meal => {
                    const slotKey = `${day.idx}_${meal.id}`;
                    const recipeId = weekData[slotKey];
                    const recipe = recipeId != null ? allRecipes.find(r => r.id === recipeId) ?? null : null;
                    const flagged = recipe != null && recipe.requiredIngredients?.some(i =>
                      blocked.some(b => i.toLowerCase().includes(b.toLowerCase()))
                    );
                    const isDropTarget = dropTarget === slotKey;

                    return (
                      <div
                        key={meal.id}
                        className={[
                          'meal-slot',
                          recipe == null ? 'empty' : '',
                          flagged === true ? 'flagged' : '',
                          isDropTarget ? 'drop-target' : '',
                        ].filter(Boolean).join(' ')}
                        onDragOver={e => { e.preventDefault(); setDropTarget(slotKey); }}
                        onDragLeave={() => setDropTarget(t => t === slotKey ? null : t)}
                        onDrop={e => {
                          e.preventDefault();
                          const id = e.dataTransfer.getData('text/plain') || dragId;
                          if (id != null) {
                            if (dragSourceSlot != null && dragSourceSlot !== slotKey) {
                              const next = { ...weekData };
                              delete next[dragSourceSlot];
                              next[slotKey] = id;
                              setPlanner({ ...planner, [weekKey]: next });
                            } else {
                              setSlot(day.idx, meal.id, id);
                            }
                          }
                          setDropTarget(null);
                          setDragId(null);
                          setDragSourceSlot(null);
                        }}
                      >
                        <div className="meal-slot-eyebrow">
                          <span>{isEn ? meal.en : meal.bg}</span>
                          {recipe != null && suggestionIds.has(recipe.id) && (
                            <span className="meal-slot-suggestion">· ✨ Gemini</span>
                          )}
                          {flagged === true && (
                            <span className="meal-slot-flag">· {isEn ? 'check' : 'провери'}</span>
                          )}
                        </div>
                        {recipe != null ? (
                          <>
                            <div
                              className="meal-filled"
                              draggable
                              onDragStart={e => {
                                e.dataTransfer.setData('text/plain', recipe.id);
                                setDragId(recipe.id);
                                setDragSourceSlot(slotKey);
                              }}
                              onDragEnd={() => { setDragId(null); setDragSourceSlot(null); setDropTarget(null); }}
                              onClick={() => {
                                // Suggestions aren't in the Recipes screen yet, so open the
                                // local preview instead of navigating to a recipe that isn't there.
                                if (suggestionIds.has(recipe.id)) {
                                  setPreviewSuggestion(recipe);
                                } else {
                                  onViewRecipe?.(recipe.id);
                                }
                              }}
                            >
                              <div className="meal-emoji">
                                <span className="meal-emoji-char">{recipe.emoji}</span>
                              </div>
                              <div className="meal-text">
                                <div className="meal-name">
                                  {isEn && recipe.nameEn != null ? recipe.nameEn : recipe.name}
                                </div>
                                <div className="meal-meta">{recipe.time} {isEn ? 'MIN' : 'МИН'}</div>
                              </div>
                            </div>
                            <button
                              className="meal-remove"
                              onClick={e => { e.stopPropagation(); clearSlot(day.idx, meal.id); }}
                              title={isEn ? 'Clear' : 'Изчисти'}
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <button
                            className="meal-slot-cta"
                            onClick={() => setPickerOpen({ day: day.idx, meal: meal.id })}
                          >
                            <span className="meal-slot-cta-plus">+</span>
                            <span>{isEn ? 'drop or pick' : 'пусни или избери'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="planner-rail">
          <div className="recipe-drawer">
            <div className="recipe-drawer-head">
              <div className="drawer-title">{isEn ? 'Recipes' : 'Рецепти'}</div>
              <div className="drawer-count">{filteredRecipes.length} / {pickableRecipes.length}</div>
            </div>
            <div className="drawer-search">
              <span className="drawer-search-glyph">⌕</span>
              <input
                className="drawer-search-input"
                value={drawerQuery}
                onChange={e => setDrawerQuery(e.target.value)}
                placeholder={isEn ? 'Search…' : 'Търси…'}
              />
            </div>
            {hasFavoriteRecipes && (
              <div className="drawer-chips drawer-chips-source">
                {([
                  ['mine',      isEn ? 'Mine'      : 'Мои'],
                  ['favorites', isEn ? 'Favorites' : 'Любими'],
                  ['all',       isEn ? 'All'       : 'Всички'],
                ] as [RecipeSource, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    className={`drawer-chip${sourceFilter === id ? ' on' : ''}`}
                    onClick={() => setSourceFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="drawer-chips">
              {([
                ['all',       isEn ? 'All'       : 'Всички'],
                ['breakfast', isEn ? 'Breakfast' : 'Закуска'],
                ['lunch',     isEn ? 'Lunch'     : 'Обяд'],
                ['dinner',    isEn ? 'Dinner'    : 'Вечеря'],
              ] as [DrawerFilter, string][]).map(([id, label]) => (
                <button
                  key={id}
                  className={`drawer-chip${drawerFilter === id ? ' on' : ''}`}
                  onClick={() => setDrawerFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="drawer-list">
              {filteredRecipes.map(r => {
                const flagged = r.requiredIngredients?.some(i =>
                  blocked.some(b => i.toLowerCase().includes(b.toLowerCase()))
                );
                return (
                  <div
                    key={r.id}
                    className={[
                      'drawer-recipe',
                      flagged === true ? 'flagged' : '',
                      dragId === r.id ? 'dragging' : '',
                    ].filter(Boolean).join(' ')}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('text/plain', r.id); setDragId(r.id); setDragSourceSlot(null); }}
                    onDragEnd={() => { setDragId(null); setDragSourceSlot(null); setDropTarget(null); }}
                  >
                    <div className="drawer-recipe-emoji">
                      {(r.imageUrls?.[0] ?? r.imageUrl)
                        ? <img src={r.imageUrls?.[0] ?? r.imageUrl} alt={isEn && r.nameEn != null ? r.nameEn : r.name} className="drawer-recipe-img" />
                        : <span className="drawer-recipe-emoji-char">{r.emoji}</span>}
                    </div>
                    <div className="drawer-recipe-text">
                      <div className="drawer-recipe-name">
                        {isEn && r.nameEn != null ? r.nameEn : r.name}
                      </div>
                      <div className="drawer-recipe-meta">
                        {r.time} {isEn ? 'MIN' : 'МИН'} · {localizeMealTag(r.tags?.[0], isEn, isEn ? 'recipe' : 'рецепта')}
                      </div>
                    </div>
                    <div className="drawer-recipe-actions-row">
                      {onViewRecipe && mineIds.has(r.id) && (
                        <button className="drawer-recipe-action-btn" title={isEn ? 'Edit' : 'Редактирай'} onClick={(e) => { e.stopPropagation(); onViewRecipe(r.id); }}>✏</button>
                      )}
                      {onDeleteRecipe && mineIds.has(r.id) && (
                        <button className="drawer-recipe-action-btn drawer-recipe-action-btn--danger" title={isEn ? 'Delete' : 'Изтрий'} onClick={(e) => { e.stopPropagation(); setPendingDeleteRecipeId(r.id); }}>🗑</button>
                      )}
                      <div className="drawer-recipe-grip">::</div>
                    </div>
                  </div>
                );
              })}
              {filteredSuggestions.length > 0 && (
                <div className="drawer-suggestions">
                  <div className="drawer-suggestions-head">
                    <span className="drawer-suggestions-title">
                      ✨ {isEn ? 'Gemini suggestions' : 'Предложения от Gemini'}
                    </span>
                    <button className="drawer-suggestions-clear" onClick={clearSuggestions}>
                      {isEn ? 'Clear' : 'Изчисти'}
                    </button>
                  </div>
                  {filteredSuggestions.map(r => (
                    <div
                      key={r.id}
                      className={`drawer-recipe is-suggestion${dragId === r.id ? ' dragging' : ''}`}
                      draggable
                      onDragStart={e => { e.dataTransfer.setData('text/plain', r.id); setDragId(r.id); setDragSourceSlot(null); }}
                      onDragEnd={() => { setDragId(null); setDragSourceSlot(null); setDropTarget(null); }}
                    >
                      <button
                        type="button"
                        className="drawer-recipe-main"
                        onClick={() => setPreviewSuggestion(r)}
                        title={isEn ? 'View full recipe' : 'Виж цялата рецепта'}
                      >
                        <div className="drawer-recipe-emoji">
                          <span className="drawer-recipe-emoji-char">{r.emoji}</span>
                        </div>
                        <div className="drawer-recipe-text">
                          <div className="drawer-recipe-name">
                            {isEn && r.nameEn != null ? r.nameEn : r.name}
                          </div>
                          <div className="drawer-recipe-meta">
                            {r.time} {isEn ? 'MIN' : 'МИН'} · {isEn ? 'suggestion' : 'предложение'}
                          </div>
                        </div>
                      </button>
                      <div className="drawer-recipe-actions">
                        <button
                          className="drawer-recipe-save"
                          onClick={() => saveSuggestion(r)}
                          aria-label={isEn ? 'Save to my recipes' : 'Запази в моите рецепти'}
                          title={isEn ? 'Save to my recipes' : 'Запази в моите рецепти'}
                        >
                          ＋
                        </button>
                        <button
                          className="drawer-recipe-del"
                          onClick={() => removeSuggestion(r.id)}
                          aria-label={isEn ? 'Remove suggestion' : 'Премахни предложението'}
                          title={isEn ? 'Remove suggestion' : 'Премахни предложението'}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {filteredRecipes.length === 0 && filteredSuggestions.length === 0 && (
                <div className="drawer-empty">
                  {isEn ? 'Nothing matches.' : 'Нищо не намерихме.'}
                </div>
              )}
            </div>
          </div>

          <div className="shopping-card">
            <div className="shopping-card-glyph">∑</div>
            <div className="shopping-card-eyebrow">
              {isEn ? 'End of the week' : 'Краят на седмицата'}
            </div>
            <div className="shopping-card-title">
              {isEn ? 'Shopping list' : 'Списък за пазар'}
            </div>
            <div className="shopping-card-sub">
              {mealsPlanned === 0
                ? (isEn
                    ? 'Plan a meal first — the list will assemble itself.'
                    : 'Първо планирай — списъкът ще се сглоби сам.')
                : (isEn
                    ? `${mealsPlanned} meals across ${uniqueRecipeCount} recipes call for ${missingCount + haveCount} ingredients.`
                    : `${mealsPlanned} хранения от ${uniqueRecipeCount} рецепти искат ${missingCount + haveCount} продукта.`)}
            </div>
            <div className="shopping-card-stats">
              <div className="shopping-card-stat">
                <div className="shopping-card-stat-num">{missingCount}</div>
                <div className="shopping-card-stat-label">{isEn ? 'To buy' : 'За пазар'}</div>
              </div>
              <div className="shopping-card-stat">
                <div className="shopping-card-stat-num">{haveCount}</div>
                <div className="shopping-card-stat-label">{isEn ? 'On shelves' : 'На рафта'}</div>
              </div>
            </div>
            <button
              className="shopping-card-btn"
              onClick={() => setShopOpen(true)}
              disabled={mealsPlanned === 0}
            >
              {isEn ? 'Generate list' : 'Генерирай списъка'}
              <span className="shopping-card-btn-arrow">→</span>
            </button>
          </div>
        </aside>
      </div>

      {pickerOpen != null && (
        <PickerModal
          recipes={pickableRecipes}
          lang={lang}
          blocked={blocked}
          dayName={days[pickerOpen.day].name}
          mealName={isEn
            ? MEALS.find(m => m.id === pickerOpen.meal)?.en ?? ''
            : MEALS.find(m => m.id === pickerOpen.meal)?.bg ?? ''}
          onClose={() => setPickerOpen(null)}
          onPick={id => { setSlot(pickerOpen.day, pickerOpen.meal, id); setPickerOpen(null); }}
        />
      )}

      {previewSuggestion != null && (
        <Modal open onClose={() => setPreviewSuggestion(null)} contentClassName="modal-recipe">
          <RecipeDetailView
            recipe={previewSuggestion}
            allergies={profile.allergies}
            dislikes={profile.dislikes}
            lang={lang}
            isOwner={false}
            fridge={fridge}
            showBackButton={false}
            onBack={() => setPreviewSuggestion(null)}
          />
          <div className="shop-modal-footer">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { removeSuggestion(previewSuggestion.id); setPreviewSuggestion(null); }}
            >
              {isEn ? 'Remove' : 'Премахни'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { saveSuggestion(previewSuggestion); setPreviewSuggestion(null); }}
            >
              {isEn ? 'Add to my recipes' : 'Запази в моите рецепти'}
            </button>
          </div>
        </Modal>
      )}

      {shopOpen && (
        <ShoppingModal
          items={shoppingItems}
          missingCount={missingCount}
          haveCount={haveCount}
          mealsPlanned={mealsPlanned}
          weekRange={weekRange}
          lang={lang}
          onClose={() => setShopOpen(false)}
        />
      )}

      <ConfirmDeleteModal
        open={pendingDeleteRecipeId !== null}
        itemName={pendingDeleteRecipe ? recipeDisplayName(pendingDeleteRecipe, lang) : ''}
        lang={lang}
        onConfirm={() => { if (pendingDeleteRecipeId) { onDeleteRecipe?.(pendingDeleteRecipeId); removeIdsFromPlanner(new Set([pendingDeleteRecipeId])); toast.success(isEn ? 'Recipe deleted' : 'Рецептата е изтрита'); } setPendingDeleteRecipeId(null); }}
        onCancel={() => setPendingDeleteRecipeId(null)}
      />

      {overwriteConfirmOpen && (
        <Modal open onClose={() => setOverwriteConfirmOpen(false)}>
          <div className="picker-modal-title">
            {isEn
              ? `Replace ${SCOPE_LABELS[planScope].target.en}?`
              : `Замени ${SCOPE_LABELS[planScope].target.bg}?`}
          </div>
          <div className="picker-modal-sub">
            {isEn
              ? 'The current recipes in those slots will be replaced with new Gemini suggestions.'
              : 'Текущите рецепти в тези клетки ще бъдат заменени с нови предложения от Gemini.'}
          </div>
          <div className="shop-modal-footer">
            <button className="btn btn-secondary btn-sm" onClick={() => setOverwriteConfirmOpen(false)}>
              {isEn ? 'Cancel' : 'Отказ'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setOverwriteConfirmOpen(false); doGeminiPlan(true); }}
            >
              {isEn
                ? `Re-plan ${SCOPE_LABELS[planScope].target.en}`
                : `Нов план за ${SCOPE_LABELS[planScope].target.bg}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
