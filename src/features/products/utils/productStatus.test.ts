import { describe, it, expect } from 'vitest';
import { statusBadge, statusLabel } from './productStatus';

describe('statusBadge', () => {
  it('maps liked → safe', () => expect(statusBadge('liked')).toBe('safe'));
  it('maps disliked → dislike', () => expect(statusBadge('disliked')).toBe('dislike'));
  it('maps allergic → allergy', () => expect(statusBadge('allergic')).toBe('allergy'));
});

describe('statusLabel', () => {
  it('returns Bulgarian labels', () => {
    expect(statusLabel('liked', 'bg')).toBe('✓ Харесвам');
    expect(statusLabel('disliked', 'bg')).toBe('✗ Не харесвам');
    expect(statusLabel('allergic', 'bg')).toBe('⚠ Алергия');
  });

  it('returns English labels', () => {
    expect(statusLabel('liked', 'en')).toBe('✓ Safe');
    expect(statusLabel('disliked', 'en')).toBe('✗ Dislike');
    expect(statusLabel('allergic', 'en')).toBe('⚠ Allergy');
  });
});
