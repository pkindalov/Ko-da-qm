import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openGoogleTranslate } from './openGoogleTranslate';

const shortRecipe = {
  name: 'Chicken Soup',
  ingredients: ['chicken', 'salt'],
  steps: ['Boil water', 'Add chicken'],
};

describe('openGoogleTranslate', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens Google Translate with text in URL for a short recipe', async () => {
    const result = await openGoogleTranslate(shortRecipe);

    expect(result.clipboardUsed).toBe(false);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('translate.google.com'),
      '_blank',
    );
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('text='),
      '_blank',
    );
  });

  it('translates the recipe name (its source content)', async () => {
    await openGoogleTranslate({ ...shortRecipe, name: 'Пилешка супа' }, 'bg', 'en');

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Пилешка супа')),
      '_blank',
    );
  });

  it('defaults to translating English → Bulgarian', async () => {
    await openGoogleTranslate(shortRecipe);

    const [url] = (window.open as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain('sl=en&tl=bg');
  });

  it('uses the provided source and target languages in the URL', async () => {
    await openGoogleTranslate(shortRecipe, 'bg', 'en');

    const [url] = (window.open as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain('sl=bg&tl=en');
  });

  it('includes numbered steps in the URL', async () => {
    await openGoogleTranslate({ ...shortRecipe, steps: ['Step one', 'Step two'] });

    const [url] = (window.open as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(decodeURIComponent(url)).toContain('1. Step one');
    expect(decodeURIComponent(url)).toContain('2. Step two');
  });

  it('copies to clipboard and opens base URL for recipes over 8000 chars', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeTextMock }, configurable: true });

    const longRecipe = { ...shortRecipe, steps: ['x'.repeat(8000)] };
    const result = await openGoogleTranslate(longRecipe);

    expect(result.clipboardUsed).toBe(true);
    expect(writeTextMock).toHaveBeenCalled();
    const [url] = (window.open as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).not.toContain('text=');
  });

  it('still opens Google Translate and returns clipboardUsed=false when clipboard write fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
      configurable: true,
    });

    const longRecipe = { ...shortRecipe, steps: ['x'.repeat(8000)] };
    const result = await openGoogleTranslate(longRecipe);

    expect(result.clipboardUsed).toBe(false);
    expect(window.open).toHaveBeenCalledWith(
      expect.not.stringContaining('text='),
      '_blank',
    );
  });
});
