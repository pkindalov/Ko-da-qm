import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { matchFromFridge } from '../utils/matchFromFridge';
import type { FridgeItem, Profile, Recipe, Language } from '../../../shared/types';

const FRIDGE_EMOJIS = ['🥚', '🧀', '🍞', '🧈', '🥛', '🍚', '🍗', '🥔', '🍎', '🍅', '🥕', '🥦', '🧅', '🫙', '📦'];

interface FridgeScreenProps {
  fridge: FridgeItem[];
  setFridge: (fridge: FridgeItem[]) => void;
  profile: Profile;
  recipes: Recipe[];
  lang: Language;
}

export function FridgeScreen({ fridge, setFridge, profile, recipes, lang }: FridgeScreenProps) {
  const L = lang === 'en';
  const [newItem, setNewItem] = useState('');
  const [newEmoji, setNewEmoji] = useState('📦');
  const [addOpen, setAddOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof matchFromFridge> | null>(null);

  const removeItem = (id: string) => setFridge(fridge.filter((f) => f.id !== id));

  const addItem = () => {
    if (!newItem.trim()) return;
    setFridge([...fridge, { id: 'f' + Date.now(), name: newItem.trim(), emoji: newEmoji, category: 'other' }]);
    setNewItem('');
    setNewEmoji('📦');
    setAddOpen(false);
  };

  const blocked = [...profile.allergies, ...profile.dislikes];

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
            <div className="page-sub">{fridge.length} {L ? 'items' : 'продукта'}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
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
      ) : (
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
          <div className="section-title">{L ? 'RECIPES FROM WHAT YOU HAVE' : 'РЕЦЕПТИ ОТ НАЛИЧНИ ПРОДУКТИ'}</div>
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
        </>
      )}

      <div className="divider" />
      <div className="section-title">{L ? 'RECIPE SUGGESTIONS' : 'ПРЕДЛОЖЕНИЯ ОТ БАЗАТА'}</div>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 14, fontWeight: 600 }}>
        {L ? 'Find recipes that match what you have at home.' : 'Намери рецепти спрямо наличните продукти и твоите ограничения.'}
      </p>
      <button
        className="btn btn-primary btn-full"
        onClick={() => setSuggestions(matchFromFridge(fridge, blocked))}
        disabled={fridge.length === 0}
      >
        🔍 {L ? 'What can I cook?' : 'Какво мога да готвя?'}
      </button>

      {suggestions !== null && (
        <div style={{ marginTop: 16 }}>
          {suggestions.length === 0 ? (
            <EmptyState
              icon="😔"
              title={L ? 'No matches found' : 'Няма съвпадения'}
              subtitle={L ? 'Try adding more items to your fridge' : 'Добави повече продукти в хладилника'}
            />
          ) : (
            <div className="stack">
              {suggestions.map((r) => (
                <div key={r.id} className="card-sm" style={{ borderLeft: '3px solid var(--primary)' }}>
                  <div className="row-between" style={{ marginBottom: 6 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{r.emoji}</span>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{r.name}</span>
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
                      const inFridge = fridge.some(
                        (f) => f.name.toLowerCase().includes(ing.toLowerCase()) || ing.toLowerCase().includes(f.name.toLowerCase()),
                      );
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

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={L ? 'Add to Fridge' : 'Добави в хладилника'}>
        <div style={{ marginBottom: 14 }}>
          <label className="input-label">{L ? 'Product name' : 'Продукт'}</label>
          <input
            className="input-field"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={L ? 'e.g. Tomatoes' : 'напр. Домати'}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
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
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={addItem}>{L ? 'Add' : 'Добави'}</button>
          <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>{L ? 'Cancel' : 'Отказ'}</button>
        </div>
      </Modal>
    </div>
  );
}
