import { describe, it, expect } from 'vitest';
import { toImgurThumbnail } from './imageUrl';

describe('toImgurThumbnail', () => {
  it('converts a standard Imgur JPEG URL to a large thumbnail', () => {
    expect(toImgurThumbnail('https://i.imgur.com/aBcDeF.jpeg')).toBe('https://i.imgur.com/aBcDeFl.jpg');
  });

  it('converts an Imgur JPG URL to a large thumbnail', () => {
    expect(toImgurThumbnail('https://i.imgur.com/aBcDeF.jpg')).toBe('https://i.imgur.com/aBcDeFl.jpg');
  });

  it('converts an Imgur PNG URL and normalises extension to jpg', () => {
    expect(toImgurThumbnail('https://i.imgur.com/aBcDeF.png')).toBe('https://i.imgur.com/aBcDeFl.jpg');
  });

  it('returns a non-Imgur URL unchanged', () => {
    const url = 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg';
    expect(toImgurThumbnail(url)).toBe(url);
  });

  it('returns an empty string unchanged', () => {
    expect(toImgurThumbnail('')).toBe('');
  });

  it('returns an Imgur URL with a query string unchanged (no match → safe pass-through)', () => {
    const url = 'https://i.imgur.com/aBcDeF.jpg?foo=bar';
    expect(toImgurThumbnail(url)).toBe(url);
  });

  it('does not double-apply the thumbnail suffix when the URL is already a thumbnail', () => {
    const already = 'https://i.imgur.com/aBcDeFl.jpg';
    expect(toImgurThumbnail(already)).toBe(already);
  });

  it('handles uppercase extension gracefully', () => {
    expect(toImgurThumbnail('https://i.imgur.com/aBcDeF.JPG')).toBe('https://i.imgur.com/aBcDeFl.jpg');
  });
});
