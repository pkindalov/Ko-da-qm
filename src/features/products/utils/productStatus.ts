import type { ProductStatus, Language } from '../../../shared/types';

export const statusBadge = (status: ProductStatus): 'safe' | 'dislike' | 'allergy' => {
  if (status === 'liked') return 'safe';
  if (status === 'disliked') return 'dislike';
  return 'allergy';
};

export const statusLabel = (status: ProductStatus, lang: Language): string => {
  const isEnglish = lang === 'en';
  if (status === 'liked') return isEnglish ? '✓ Safe' : '✓ Харесвам';
  if (status === 'disliked') return isEnglish ? '✗ Dislike' : '✗ Не харесвам';
  return isEnglish ? '⚠ Allergy' : '⚠ Алергия';
};
