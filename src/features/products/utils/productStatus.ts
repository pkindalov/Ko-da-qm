import type { ProductStatus, Language } from '../../../shared/types';

export function statusBadge(status: ProductStatus): 'safe' | 'dislike' | 'allergy' {
  if (status === 'liked') return 'safe';
  if (status === 'disliked') return 'dislike';
  return 'allergy';
}

export function statusLabel(status: ProductStatus, lang: Language): string {
  const L = lang === 'en';
  if (status === 'liked') return L ? '✓ Safe' : '✓ Харесвам';
  if (status === 'disliked') return L ? '✗ Dislike' : '✗ Не харесвам';
  return L ? '⚠ Allergy' : '⚠ Алергия';
}
