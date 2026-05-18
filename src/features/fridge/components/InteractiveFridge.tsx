import { useState, useMemo } from 'react';
import type { FridgeItem } from '../../../shared/types';
import './InteractiveFridge.css';

const CATEGORY_SHELF: Record<string, number> = {
  dairy: 1, egg: 1,
  grain: 2, condiment: 2,
  veg: 3, fruit: 3,
  protein: 4, fish: 4,
  other: 2,
};

const CATEGORY_TINT: Record<string, string> = {
  dairy: 'milk',
  egg: 'egg',
  grain: 'bread',
  condiment: 'jar',
  veg: 'veg',
  fruit: 'fruit',
  protein: 'meat',
  fish: 'meat',
  other: 'jar',
};

interface InteractiveFridgeProps {
  items: FridgeItem[];
  onRemove: (id: string) => void;
  onAddSlot: () => void;
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

const FridgeShelf = ({ items, onRemove, onAddSlot, selectedIds, onToggleSelect, max = 5 }: {
  items: FridgeItem[];
  onRemove: (id: string) => void;
  onAddSlot: () => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  max?: number;
}) => (
  <div className="shelf">
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

export function InteractiveFridge({ items, onRemove, onAddSlot, selectedIds, onToggleSelect }: InteractiveFridgeProps) {
  const [open, setOpen] = useState(false);

  const byShelf = useMemo(() => {
    const m: Record<number, FridgeItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    items.forEach((it) => {
      const shelf = CATEGORY_SHELF[it.category] ?? 2;
      m[shelf].push(it);
    });
    return m;
  }, [items]);

  const toggleDoor = () => setOpen((v) => !v);

  return (
    <div className="ifridge">
      <div className={`scene-wrap ${open ? 'open' : ''}`}>
        <div className="scene-toolbar">
          <span className="chip-status">
            <span className="dot" />
            {open ? 'Door open' : 'Door closed'} · 4°C
          </span>
          <button className="btn-door" onClick={toggleDoor}>
            {open ? '⤬ Close door' : '⇲ Open fridge'}
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
                  {byShelf[0].map((it) => (
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
                </div>
                <FridgeShelf items={byShelf[1]} onRemove={onRemove} onAddSlot={onAddSlot} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
                <FridgeShelf items={byShelf[2]} onRemove={onRemove} onAddSlot={onAddSlot} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
                <FridgeShelf items={byShelf[3]} onRemove={onRemove} onAddSlot={onAddSlot} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
                <FridgeShelf items={byShelf[4]} onRemove={onRemove} onAddSlot={onAddSlot} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
              </div>
            </div>

            <div className="door-wrap">
              <div className="door" onClick={toggleDoor}>
                <div className="door-display">
                  <span>FRESH</span>
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
                <span className="pill">👆 Tap to open</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
