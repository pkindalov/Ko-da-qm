import { describe, it, expect } from 'vitest';
import { getGreeting } from './greeting';

describe('getGreeting', () => {
  it('returns morning greeting for hours 0–11', () => {
    expect(getGreeting(0, 'bg')).toBe('Добро утро');
    expect(getGreeting(11, 'bg')).toBe('Добро утро');
    expect(getGreeting(0, 'en')).toBe('Good morning');
  });

  it('returns afternoon greeting for hours 12–17', () => {
    expect(getGreeting(12, 'bg')).toBe('Добър обяд');
    expect(getGreeting(17, 'bg')).toBe('Добър обяд');
    expect(getGreeting(12, 'en')).toBe('Good afternoon');
  });

  it('returns evening greeting for hours 18–23', () => {
    expect(getGreeting(18, 'bg')).toBe('Добър вечер');
    expect(getGreeting(23, 'bg')).toBe('Добър вечер');
    expect(getGreeting(18, 'en')).toBe('Good evening');
  });
});
