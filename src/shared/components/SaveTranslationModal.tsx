import { useState } from 'react';
import { Modal } from './Modal';
import { parseTranslatedRecipe } from '../utils/parseTranslatedRecipe';
import type { Language } from '../types';

interface SaveTranslationModalProps {
  open: boolean;
  lang: Language;
  onConfirm: (name: string, ingredients: string[], steps: string[]) => Promise<void>;
  onCancel: () => void;
}

export const SaveTranslationModal = ({ open, lang, onConfirm, onCancel }: SaveTranslationModalProps) => {
  const L = lang === 'en';
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const parsed = text.trim() ? parseTranslatedRecipe(text) : null;
  const showParseError = text.trim().length > 0 && parsed === null;

  const handleConfirm = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      await onConfirm(parsed.name, parsed.ingredients, parsed.steps);
      setText('');
      onCancel();
    } catch {
      // error is handled by the caller (toast shown by updateRecipe)
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setText('');
    onCancel();
  };

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title={L ? 'Save translated version' : 'Запази превода'}
    >
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12, lineHeight: 1.5 }}>
        {L
          ? 'Paste the full translated text copied from Google Translate.'
          : 'Постави целия преведен текст, копиран от Google Translate.'}
      </p>

      <textarea
        className="input-field"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={L ? 'Paste translated text here…' : 'Постави преведения текст тук…'}
        style={{ fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical' }}
        autoFocus
      />

      {showParseError && (
        <p style={{ color: 'var(--rust)', fontSize: 13, marginTop: 8, fontWeight: 600 }}>
          {L
            ? 'Could not read the text. Make sure you copied the full translated recipe.'
            : 'Текстът не може да бъде разчетен. Увери се, че си копирал цялата преведена рецепта.'}
        </p>
      )}

      {parsed && (
        <div style={{
          marginTop: 12,
          padding: '10px 14px',
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          fontSize: 13,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{parsed.name}</div>
          <div style={{ color: 'var(--ink-2)', marginBottom: 2 }}>
            {L
              ? `${parsed.ingredients.length} ingredients · ${parsed.steps.length} steps`
              : `${parsed.ingredients.length} съставки · ${parsed.steps.length} стъпки`}
          </div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>
            {parsed.ingredients.slice(0, 3).join(' · ')}{parsed.ingredients.length > 3 ? ' · …' : ''}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={handleConfirm}
          disabled={!parsed || saving}
        >
          {saving
            ? (L ? 'Saving…' : 'Запазва…')
            : (L ? 'Save translation' : 'Запази превода')}
        </button>
        <button className="btn btn-ghost" onClick={handleCancel}>
          {L ? 'Cancel' : 'Отказ'}
        </button>
      </div>
    </Modal>
  );
};
