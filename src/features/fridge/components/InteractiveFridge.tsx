import { useState, useMemo, useCallback, useEffect } from 'react';
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

const POPOVER_W = 180;
const POPOVER_H_EST = 72;

interface PopoverState {
  id: string;
  name: string;
  status: 'disliked' | 'allergic';
  badgeLeft: number;
  badgeRight: number;
  badgeTop: number;
  badgeBottom: number;
  badgeWidth: number;
}

interface InteractiveFridgeProps {
  items: FridgeItem[];
  onRemove: (id: string) => void;
  onAddSlot: () => void;
  lang: Language;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  productStatusByName?: Map<string, 'disliked' | 'allergic'>;
}

const FridgeProduct = ({ item, onRemove, selected, onToggleSelect, status, onStatusBadgeClick, lang }: {
  item: FridgeItem;
  onRemove: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  status?: 'disliked' | 'allergic';
  onStatusBadgeClick?: (e: React.MouseEvent, item: FridgeItem, status: 'disliked' | 'allergic') => void;
  lang: Language;
}) => {
  const L = lang === 'en';
  const statusLabel = status === 'allergic'
    ? (L ? 'Allergic ⚠' : 'Алергичен ⚠')
    : status === 'disliked'
    ? (L ? 'Disliked' : 'Нехаресван')
    : undefined;
  return (
    <div
      className={`product tint-${CATEGORY_TINT[item.category] ?? 'jar'}${selected ? ' selected' : ''}${onToggleSelect ? ' selectable' : ''}${status ? ` status-${status}` : ''}`}
      title={statusLabel ? `${item.name} — ${statusLabel}` : item.name}
      onClick={(e) => {
        onToggleSelect?.(item.id);
        if (status) onStatusBadgeClick?.(e, item, status);
      }}
    >
      <span className="p-check">✓</span>
      {status && (
        <span
          className="p-status"
          role="button"
          aria-label={`${item.name}: ${status}`}
          onClick={(e) => { e.stopPropagation(); onStatusBadgeClick?.(e, item, status); }}
        >
          {status === 'allergic' ? '!' : '–'}
        </span>
      )}
      <span className="p-emoji">{item.emoji}</span>
      <span className="p-lbl">{item.name}</span>
      <button className="p-rm" onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}>✕</button>
    </div>
  );
};

const FridgeShelf = ({ items, onRemove, onAddSlot, selectedIds, onToggleSelect, shelfLabel, max = 5, productStatusByName, onStatusBadgeClick, lang }: {
  items: FridgeItem[];
  onRemove: (id: string) => void;
  onAddSlot: () => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  shelfLabel?: string;
  max?: number;
  productStatusByName?: Map<string, 'disliked' | 'allergic'>;
  onStatusBadgeClick?: (e: React.MouseEvent, item: FridgeItem, status: 'disliked' | 'allergic') => void;
  lang: Language;
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
        status={productStatusByName?.get(it.name.toLowerCase())}
        onStatusBadgeClick={onStatusBadgeClick}
        lang={lang}
      />
    ))}
    {items.length < max && <button className="add-slot" onClick={onAddSlot}>+</button>}
  </div>
);

export const InteractiveFridge = ({ items, onRemove, onAddSlot, lang, selectedIds, onToggleSelect, productStatusByName }: InteractiveFridgeProps) => {
  const L = lang === 'en';
  const [open, setOpen] = useState(false);
  const [activePopover, setActivePopover] = useState<PopoverState | null>(null);

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

  const handleStatusBadgeClick = useCallback((e: React.MouseEvent, item: FridgeItem, status: 'disliked' | 'allergic') => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActivePopover({
      id: item.id,
      name: item.name,
      status,
      badgeLeft: rect.left,
      badgeRight: rect.right,
      badgeTop: rect.top,
      badgeBottom: rect.bottom,
      badgeWidth: rect.width,
    });
  }, []);

  // Escape key dismissal only — click dismissal is handled by the backdrop overlay
  useEffect(() => {
    if (!activePopover) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActivePopover(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activePopover]);

  const toggleDoor = () => setOpen((v) => !v);

  const popover = (() => {
    if (!activePopover) return null;
    const vw = window.innerWidth || 800;
    const vh = window.innerHeight || 600;
    const midX = activePopover.badgeLeft + activePopover.badgeWidth / 2;
    const showAbove = vh - activePopover.badgeBottom < POPOVER_H_EST + 12;
    const top = showAbove
      ? activePopover.badgeTop - POPOVER_H_EST - 8
      : activePopover.badgeBottom + 8;
    const left = Math.max(8, Math.min(midX - POPOVER_W / 2, vw - POPOVER_W - 8));
    const statusLabel = activePopover.status === 'allergic'
      ? (L ? 'Allergic' : 'Алергичен')
      : (L ? 'Disliked' : 'Нехаресван');
    const statusDesc = activePopover.status === 'allergic'
      ? (L ? 'You marked this as an allergen.' : 'Маркиран като алерген.')
      : (L ? 'You marked this as disliked.' : 'Маркиран като нехаресван.');
    return (
      <>
        {/* Backdrop: covers the viewport so any tap outside the popover closes it.
            Sits below the popover (z-index 9998 vs 9999) so the popover itself is still interactive. */}
        <div
          data-testid="popover-backdrop"
          style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
          onClick={() => setActivePopover(null)}
          aria-hidden="true"
        />
        <div
          className={`p-popover p-popover-${activePopover.status}`}
          style={{ position: 'fixed', top, left, width: POPOVER_W, zIndex: 9999 }}
          role="tooltip"
        >
          <span className="p-popover-name">{activePopover.name}</span>
          <span className="p-popover-status">{statusLabel}</span>
          <span className="p-popover-desc">{statusDesc}</span>
        </div>
      </>
    );
  })();

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
                      status={productStatusByName?.get(it.name.toLowerCase())}
                      onStatusBadgeClick={handleStatusBadgeClick}
                      lang={lang}
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
                          productStatusByName={productStatusByName}
                          onStatusBadgeClick={handleStatusBadgeClick}
                          lang={lang}
                        />
                      );
                    })
                  : <FridgeShelf items={[]} onRemove={onRemove} onAddSlot={onAddSlot} selectedIds={selectedIds} onToggleSelect={onToggleSelect} productStatusByName={productStatusByName} onStatusBadgeClick={handleStatusBadgeClick} lang={lang} />
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

      {popover}
    </div>
  );
}
