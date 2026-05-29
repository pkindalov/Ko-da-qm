import { useState, useMemo, useCallback } from 'react';
import { Modal } from '../../../shared/components/Modal';
import type { Recipe, FridgeItem, Product, Profile, Language } from '../../../shared/types';
import { planWithGemini } from '../utils/planWithGemini';
import './PlannerScreen.css';

type PlannerData = Record<string, Record<string, string>>;
type MealId = 'breakfast' | 'lunch' | 'dinner';
type DrawerFilter = 'all' | MealId;

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
                  {r.time} {isEn ? 'MIN' : 'МИН'} · {r.tags?.[0] ?? (isEn ? 'recipe' : 'рецепта')}
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
  addRecipe: (recipe: Recipe) => void;
  profile: Profile;
  lang: Language;
  planner: PlannerData;
  setPlanner: (data: PlannerData) => void;
  onViewRecipe?: (id: string) => void;
}

export const PlannerScreen = ({ recipes, fridge, products = [], addRecipe, profile, lang, planner, setPlanner, onViewRecipe }: PlannerScreenProps) => {
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

  const clearWeek = useCallback(() => {
    setPlanner({ ...planner, [weekKey]: {} });
  }, [planner, weekKey, setPlanner]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragSourceSlot, setDragSourceSlot] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<PickerTarget | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState('');
  const [drawerFilter, setDrawerFilter] = useState<DrawerFilter>('all');

  const filteredRecipes = useMemo(() => {
    const q = drawerQuery.toLowerCase().trim();
    return recipes.filter(r => {
      const name = ((isEn ? r.nameEn : r.name) ?? r.name).toLowerCase();
      if (q && !name.includes(q)) return false;
      if (drawerFilter === 'all') return true;
      // Bug fix: support both BG tags (stored in DB) and EN drawer filter IDs
      const tagBg = MEAL_TAG_BG[drawerFilter];
      return r.tags?.some(tag => {
        const t = tag.toLowerCase();
        return t === tagBg || t === drawerFilter;
      }) ?? false;
    });
  }, [recipes, drawerQuery, drawerFilter, isEn]);

  const assignedIds = useMemo(() => Object.values(weekData).filter(id => id !== ''), [weekData]);

  // Bug fix: use type predicate to narrow (Recipe | undefined)[] → Recipe[]
  const assignedRecipes = useMemo(() =>
    assignedIds
      .map(id => recipes.find(r => r.id === id))
      .filter((r): r is Recipe => r != null),
    [assignedIds, recipes],
  );

  const mealsPlanned = assignedRecipes.length;
  const uniqueRecipeCount = useMemo(() => new Set(assignedRecipes.map(r => r.id)).size, [assignedRecipes]);

  const [planningLoading, setPlanningLoading] = useState(false);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);

  const doGeminiPlan = useCallback(async (overwrite: boolean) => {
    if (recipes.length === 0) return;
    setPlanningLoading(true);
    try {
      const scheduledNames = assignedRecipes.map(r => isEn && r.nameEn != null ? r.nameEn : r.name);
      const plan = await planWithGemini(recipes, fridge, products, blocked, liked, profile.dietaryPrefs, lang, addRecipe, scheduledNames);
      if (Object.keys(plan).length === 0) return;
      if (overwrite) {
        setPlanner({ ...planner, [weekKey]: plan });
      } else {
        const merged = { ...weekData };
        for (const [slot, id] of Object.entries(plan)) {
          if (!merged[slot]) merged[slot] = id;
        }
        setPlanner({ ...planner, [weekKey]: merged });
      }
    } finally {
      setPlanningLoading(false);
    }
  }, [recipes, fridge, products, blocked, liked, profile.dietaryPrefs, lang, addRecipe, assignedRecipes, isEn, planner, weekKey, weekData, setPlanner]);

  const handlePlanWithGemini = useCallback(() => {
    const emptyCount = ALL_SLOT_KEYS.filter(s => !weekData[s]).length;
    if (emptyCount === 0) {
      setOverwriteConfirmOpen(true);
    } else {
      doGeminiPlan(false);
    }
  }, [weekData, doGeminiPlan]);

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
            {recipes.length > 0 && (
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
            {mealsPlanned > 0 && (
              <button className="btn btn-ghost btn-xs" onClick={clearWeek}>
                {isEn ? 'Clear week' : 'Изчисти седмицата'}
              </button>
            )}
          </div>
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
                    const recipe = recipeId != null ? recipes.find(r => r.id === recipeId) ?? null : null;
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
                              onClick={() => onViewRecipe?.(recipe.id)}
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
              <div className="drawer-count">{filteredRecipes.length} / {recipes.length}</div>
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
                      <span className="drawer-recipe-emoji-char">{r.emoji}</span>
                    </div>
                    <div className="drawer-recipe-text">
                      <div className="drawer-recipe-name">
                        {isEn && r.nameEn != null ? r.nameEn : r.name}
                      </div>
                      <div className="drawer-recipe-meta">
                        {r.time} {isEn ? 'MIN' : 'МИН'} · {r.tags?.[0] ?? (isEn ? 'recipe' : 'рецепта')}
                      </div>
                    </div>
                    <div className="drawer-recipe-grip">::</div>
                  </div>
                );
              })}
              {filteredRecipes.length === 0 && (
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
          recipes={recipes}
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

      {overwriteConfirmOpen && (
        <Modal open onClose={() => setOverwriteConfirmOpen(false)}>
          <div className="picker-modal-title">
            {isEn ? 'Replace the whole week?' : 'Замени цялата седмица?'}
          </div>
          <div className="picker-modal-sub">
            {isEn
              ? 'All current recipes will be replaced with new Gemini suggestions.'
              : 'Всички текущи рецепти ще бъдат заменени с нови предложения от Gemini.'}
          </div>
          <div className="shop-modal-footer">
            <button className="btn btn-secondary btn-sm" onClick={() => setOverwriteConfirmOpen(false)}>
              {isEn ? 'Cancel' : 'Отказ'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setOverwriteConfirmOpen(false); doGeminiPlan(true); }}
            >
              {isEn ? 'Re-plan everything' : 'Нов план за всичко'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
