import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openGoogleTranslate } from './openGoogleTranslate';

const shortRecipe = {
  name: 'Chicken Soup',
  nameEn: 'Chicken Soup',
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

  it('uses nameEn over name when building the text', async () => {
    await openGoogleTranslate({ ...shortRecipe, name: 'Пилешка супа', nameEn: 'Chicken Soup' });

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Chicken Soup')),
      '_blank',
    );
  });

  it('falls back to name when nameEn is null', async () => {
    await openGoogleTranslate({ ...shortRecipe, name: 'Chicken Soup', nameEn: null });

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Chicken Soup')),
      '_blank',
    );
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
