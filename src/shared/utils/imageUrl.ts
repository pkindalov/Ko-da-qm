/**
 * Returns the Imgur "large thumbnail" variant of a URL (640px max, ~70% smaller).
 * Non-Imgur URLs are returned unchanged.
 *
 * Imgur thumbnail API: insert a suffix letter before the file extension.
 *   l = large (640×640 max, preserves aspect ratio)
 * https://i.imgur.com/aBcDeF.jpeg → https://i.imgur.com/aBcDeFl.jpg
 */
export function toImgurThumbnail(url: string): string {
  const match = url.match(/^(https?:\/\/i\.imgur\.com\/)([A-Za-z0-9]+)\.[a-z]+$/i);
  if (!match) return url;
  return `${match[1]}${match[2]}l.jpg`;
}
