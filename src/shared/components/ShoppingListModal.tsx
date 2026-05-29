import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import type { Recipe, FridgeItem, Language } from '../types';
import './ShoppingListModal.css';

interface ShoppingListModalProps {
  open: boolean;
  onClose: () => void;
  recipe: Recipe;
  fridge: FridgeItem[];
  lang: Language;
}

const hasInFridge = (req: string, fridgeLow: string[]) => {
  const r = req.toLowerCase();
  return fridgeLow.some(f => f.includes(r) || r.includes(f));
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findQty = (req: string, ingredients: string[]) => {
  const r = req.toLowerCase();
  const match = ingredients.find(s => s.toLowerCase().includes(r));
  if (!match) return '';
  return match.replace(new RegExp(`\\s*${escapeRegex(req)}.*$`, 'i'), '').trim();
};

const findFullLine = (req: string, ingredients: string[]) =>
  ingredients.find(s => s.toLowerCase().includes(req.toLowerCase())) ?? req;

export const ShoppingListModal = ({ open, onClose, recipe, fridge, lang }: ShoppingListModalProps) => {
  const isEnglish = lang === 'en';
  const fridgeLow = fridge.map(f => f.name.toLowerCase());

  const required = recipe.requiredIngredients ?? [];
  const missing = required.filter(i => !hasInFridge(i, fridgeLow));
  const have = required.filter(i => hasInFridge(i, fridgeLow));

  const storageKey = `kdj-shop-${recipe.id}`;
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    try {
      setChecked(new Set(JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[]));
    } catch {
      setChecked(new Set());
    }
  }, [recipe.id, open]);

  const persist = (next: Set<string>) => {
    setChecked(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {}
  };

  const toggle = (ing: string) => {
    const next = new Set(checked);
    if (next.has(ing)) next.delete(ing); else next.add(ing);
    persist(next);
  };

  const shareText = () => {
    const title = isEnglish && recipe.nameEn ? recipe.nameEn : recipe.name;
    const header = (isEnglish ? 'Shopping list — ' : 'Списък за пазар — ') + title;
    const lines = missing.map(m => '— ' + findFullLine(m, recipe.ingredients));
    return [header, '', ...lines].join('\n');
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 1800);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      showToast(isEnglish ? 'Copied' : 'Копирано');
    } catch {
      showToast(isEnglish ? 'Copy failed' : 'Грешка');
    }
  };

  const share = async () => {
    const text = shareText();
    const title = (isEnglish ? 'Shopping list — ' : 'Списък за пазар — ') +
      (isEnglish && recipe.nameEn ? recipe.nameEn : recipe.name);
    if (navigator.share) {
      try { await navigator.share({ title, text }); return; } catch {}
    }
    copy();
  };

  const clearTicks = () => persist(new Set());

  const checkedCount = [...checked].filter(c => missing.includes(c)).length;
  const allDone = missing.length > 0 && checkedCount === missing.length;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="eyebrow shop-modal-eyebrow">
        {isEnglish ? 'Shop missing' : 'Пазарувай'} · {isEnglish && recipe.nameEn ? recipe.nameEn : recipe.name}
      </div>
      <div className={`modal-title${missing.length === 0 ? '' : ' shop-modal-title-italic'}`}>
        {missing.length === 0
          ? (isEnglish ? 'You have it all' : 'Имаш всичко')
          : (isEnglish ? 'A short list' : 'Кратък списък')}
      </div>
      <div className="modal-sub">
        {missing.length === 0
          ? (isEnglish
            ? 'Your fridge covers every ingredient this recipe needs.'
            : 'Хладилникът ти покрива всяка съставка от рецептата.')
          : isEnglish
            ? `${missing.length} of ${required.length} ingredients to pick up. Tick them off as you go.`
            : `${missing.length} от ${required.length} съставки за купуване. Отмятай ги докато пазаруваш.`}
      </div>

      <div className="shop-summary">
        <div className="shop-stat">
          <div className="shop-stat-num clay">{missing.length}</div>
          <div className="shop-stat-label">{isEnglish ? 'to buy' : 'за купуване'}</div>
        </div>
        <div className="shop-stat">
          <div className="shop-stat-num moss">{have.length}</div>
          <div className="shop-stat-label">{isEnglish ? 'already in fridge' : 'в хладилника'}</div>
        </div>
      </div>

      {missing.length === 0 ? (
        <div className="shop-empty">
          <div className="shop-empty-glyph">🧺</div>
          <div className="shop-empty-title">{isEnglish ? 'Ready to cook' : 'Готови за готвене'}</div>
          <div className="shop-empty-sub">
            {isEnglish
              ? 'Every ingredient checked against your fridge — no detour to the shop.'
              : 'Всички съставки са в хладилника — без отбиване до магазина.'}
          </div>
        </div>
      ) : (
        <>
          <div className="shop-eyebrow">{isEnglish ? 'Pick up' : 'Купи'}</div>
          <ul className="shop-list">
            {missing.map((ing) => {
              const isChecked = checked.has(ing);
              const qty = findQty(ing, recipe.ingredients);
              return (
                <li
                  key={ing}
                  className={`shop-row${isChecked ? ' checked' : ''}`}
                  onClick={() => toggle(ing)}
                >
                  <span className="check" aria-hidden="true" />
                  <span className="name">{ing}</span>
                  {qty && <span className="qty">{qty}</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {have.length > 0 && (
        <>
          <div className="shop-eyebrow">{isEnglish ? 'Already have' : 'Вече имаш'}</div>
          <ul className="shop-list">
            {have.map((ing) => (
              <li key={ing} className="shop-row have">
                <span className="check" aria-hidden="true" />
                <span className="name">{ing}</span>
                <span className="qty">{isEnglish ? 'in fridge' : 'хладилник'}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="shop-footer">
        <div className="shop-progress">
          {missing.length === 0
            ? (isEnglish ? 'Nothing to buy' : 'Нищо за купуване')
            : allDone
              ? (isEnglish ? 'All ticked — ready to go' : 'Всичко е отметнато')
              : <><b>{checkedCount}</b> / {missing.length} {isEnglish ? 'ticked' : 'отметнати'}</>}
        </div>
        {toastMsg && <span className="shop-toast show">· {toastMsg}</span>}
        {missing.length > 0 && checkedCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearTicks}>
            {isEnglish ? 'Reset' : 'Изчисти'}
          </button>
        )}
        {missing.length > 0 && (
          <>
            <button className="btn btn-secondary btn-sm" onClick={copy}>
              {isEnglish ? 'Copy' : 'Копирай'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={share}>
              {isEnglish ? 'Share' : 'Сподели'}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};
