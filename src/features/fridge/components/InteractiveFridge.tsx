import { useState, useMemo } from 'react';
import type { FridgeItem, FridgeItemCategory, Language } from '../../../shared/types';
import { CATEGORIES } from '../../../shared/constants/categories';
import './InteractiveFridge.css';

const CATEGORY_TINT: Record<string, string> = {
  dairy: 'milk',
  egg: 'egg',
  grain: 'bread',
  condiment: 'jar',
  veg: 'veg',
  fruit: 'fruit',
  protein: 'meat',
  fish: 'meat',
  frozen: 'frozen',
  other: 'jar',
};

// Top-to-bottom order of shelves inside the fridge
const SHELF_ORDER: FridgeItemCategory[] = [
  'dairy', 'egg', 'protein', 'fish', 'veg', 'fruit', 'grain', 'condiment', 'other',
];

interface InteractiveFridgeProps {
  items: FridgeItem[];
  onRemove: (id: string) => void;
  onAddSlot: () => void;
  lang: Language;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

const FridgeProduct = ({ item, onRemove, selected, onToggleSelect }: {
  item: FridgeItem;
  onRemove: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) => (
  <div
    className={`product tint-${CATEGORY_TINT[item.category] ?? 'jar'}${selected ? ' selected' : ''}${onToggleSelect ? ' selectable' : ''}`}
    onClick={() => onToggleSelect?.(item.id)}
  >
    <span className="p-check">✓</span>
    <span className="p-emoji">{item.emoji}</span>
    <span className="p-lbl">{item.name}</span>
    <button className="p-rm" onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}>✕</button>
  </div>
);

const FridgeShelf = ({ items, onRemove, onAddSlot, selectedIds, onToggleSelect, shelfLabel, max = 5 }: {
  items: FridgeItem[];
  onRemove: (id: string) => void;
  onAddSlot: () => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  shelfLabel?: string;
  max?: number;
}) => (
  <div className="shelf">
    {shelfLabel && <span className="shelf-label">{shelfLabel}</span>}
    {items.map((it) => (
      <FridgeProduct
        key={it.id}
        item={it}
        onRemove={onRemove}
        selected={selectedIds?.has(it.id)}
        onToggleSelect={onToggleSelect}
      />
    ))}
    {items.length < max && <button className="add-slot" onClick={onAddSlot}>+</button>}
  </div>
);

export function InteractiveFridge({ items, onRemove, onAddSlot, lang, selectedIds, onToggleSelect }: InteractiveFridgeProps) {
  const L = lang === 'en';
  const [open, setOpen] = useState(false);

  const byCategory = useMemo(() => {
    const m: Partial<Record<FridgeItemCategory, FridgeItem[]>> = {};
    items.forEach((it) => {
      if (!m[it.category]) m[it.category] = [];
      m[it.category]!.push(it);
    });
    return m;
  }, [items]);

  const populatedCategories = useMemo(
    () => SHELF_ORDER.filter(cat => (byCategory[cat]?.length ?? 0) > 0),
    [byCategory]
  );

  const toggleDoor = () => setOpen((v) => !v);

  return (
    <div className="ifridge">
      <div className={`scene-wrap ${open ? 'open' : ''}`}>
        <div className="scene-toolbar">
          <span className="chip-status">
            <span className="dot" />
            {open ? (L ? 'Door open' : 'Вратата е отворена') : (L ? 'Door closed' : 'Вратата е затворена')} · 4°C
          </span>
          <button className="btn-door" onClick={toggleDoor}>
            {open ? (L ? '⤬ Close door' : '⤬ Затвори') : (L ? '⇲ Open fridge' : '⇲ Отвори хладилника')}
          </button>
        </div>

        <div className="scene">
          <div className={`fridge ${open ? 'open' : ''}`}>
            <div className="cabinet">
              <div className="seam freezer" />
            </div>

            <div className="interior">
              <div className="shelves">
                <div className="freezer">
                  {(byCategory.frozen ?? []).map((it) => (
                    <FridgeProduct
                      key={it.id}
                      item={it}
                      onRemove={onRemove}
                      selected={selectedIds?.has(it.id)}
                      onToggleSelect={onToggleSelect}
                    />
                  ))}
                  <button className="add-slot" onClick={onAddSlot}>+</button>
                  <div className="frost" />
                  <span className="shelf-label">🧊 {L ? 'Frozen' : 'Замразено'}</span>
                </div>

                {populatedCategories.length > 0
                  ? populatedCategories.map(cat => {
                      const meta = CATEGORIES.find(c => c.id === cat)!;
                      return (
                        <FridgeShelf
                          key={cat}
                          items={byCategory[cat]!}
                          onRemove={onRemove}
                          onAddSlot={onAddSlot}
                          selectedIds={selectedIds}
                          onToggleSelect={onToggleSelect}
                          shelfLabel={`${meta.emoji} ${L ? meta.labelEn : meta.label}`}
                        />
                      );
                    })
                  : <FridgeShelf items={[]} onRemove={onRemove} onAddSlot={onAddSlot} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
                }
              </div>
            </div>

            <div className="door-wrap">
              <div className="door" onClick={toggleDoor}>
                <div className="door-display">
                  <span>{L ? 'FRESH' : 'СВЕЖО'}</span>
                  <span className="d-time">4°C</span>
                  <span>❄</span>
                </div>
                <div className="door-brand">Ко-да-ям</div>
                <div
                  className="handle"
                  onClick={(e) => { e.stopPropagation(); toggleDoor(); }}
                />
                <div className="door-inside">
                  <div className="door-bin">
                    <div className="bin-glass" />
                    <div className="bottle b1" />
                    <div className="bottle b2" />
                    <div className="bottle b3" />
                  </div>
                  <div className="door-bin">
                    <div className="bin-glass" />
                    <div className="bottle b4" />
                    <div className="bottle b5" />
                    <div className="bottle b2" />
                  </div>
                  <div className="door-bin">
                    <div className="bin-glass" />
                    <div className="bottle b3" />
                    <div className="bottle b4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="feet"><span /><span /></div>

            {!open && (
              <div className="tap-hint">
                <span className="pill">👆 {L ? 'Tap to open' : 'Натисни за отваряне'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
