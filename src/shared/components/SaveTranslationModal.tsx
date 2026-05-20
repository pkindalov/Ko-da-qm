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
  const isEnglish = lang === 'en';
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
      title={isEnglish ? 'Save translated version' : 'Запази превода'}
    >
      <p className="modal-hint">
        {isEnglish
          ? 'Paste the full translated text copied from Google Translate.'
          : 'Постави целия преведен текст, копиран от Google Translate.'}
      </p>

      <textarea
        className="input-field textarea-mono"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isEnglish ? 'Paste translated text here…' : 'Постави преведения текст тук…'}
        autoFocus
      />

      {showParseError && (
        <p className="modal-error">
          {isEnglish
            ? 'Could not read the text. Make sure you copied the full translated recipe.'
            : 'Текстът не може да бъде разчетен. Увери се, че си копирал цялата преведена рецепта.'}
        </p>
      )}

      {parsed && (
        <div className="parse-preview">
          <div className="parse-preview-name">{parsed.name}</div>
          <div className="parse-preview-info">
            {isEnglish
              ? `${parsed.ingredients.length} ingredients · ${parsed.steps.length} steps`
              : `${parsed.ingredients.length} съставки · ${parsed.steps.length} стъпки`}
          </div>
          <div className="parse-preview-ingredients">
            {parsed.ingredients.slice(0, 3).join(' · ')}{parsed.ingredients.length > 3 ? ' · …' : ''}
          </div>
        </div>
      )}

      <div className="modal-actions">
        <button
          className="btn btn-primary flex-1"
          onClick={handleConfirm}
          disabled={!parsed || saving}
        >
          {saving
            ? (isEnglish ? 'Saving…' : 'Запазва…')
            : (isEnglish ? 'Save translation' : 'Запази превода')}
        </button>
        <button className="btn btn-ghost" onClick={handleCancel}>
          {isEnglish ? 'Cancel' : 'Отказ'}
        </button>
      </div>
    </Modal>
  );
};
