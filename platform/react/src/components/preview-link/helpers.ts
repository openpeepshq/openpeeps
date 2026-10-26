import { markdownPlainText } from '@openpeepshq/common';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EXCERPT_MAX = 180;

export const isPostPath = (path: string) =>
  path.startsWith('/posts/') && UUID_RE.test(path.substring(7));

export const isJamPath = (path: string) =>
  path.startsWith('/events/') &&
  UUID_RE.test(path.substring(8, 44)) &&
  path.endsWith('/jam');

export const isGroupPath = (path: string) => path.startsWith('/groups/@');

export const isWelcomePath = (path: string) =>
  path === '/welcome' || path === '/welcome/';

export const isLocalLink = (url: string, origin: string) => {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.origin === origin &&
      (isPostPath(urlObj.pathname) ||
        isJamPath(urlObj.pathname) ||
        isGroupPath(urlObj.pathname) ||
        isWelcomePath(urlObj.pathname))
    );
  } catch {
    return false;
  }
};

/** Plain-text clip of the welcome page, without image markup. */
export const welcomePreviewExcerpt = (markdown?: string) => {
  const plain = markdownPlainText(
    (markdown ?? '').replace(/!\[[^\]]*]\([^)]*\)/g, ' '),
  );
  if (plain.length <= EXCERPT_MAX) return plain;
  const cut = plain.slice(0, EXCERPT_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  const clipped = lastSpace > 80 ? cut.slice(0, lastSpace) : cut;
  return `${clipped.trimEnd()}…`;
};

/** First content image on the welcome page, ignoring inline data URLs. */
export const firstMarkdownImage = (markdown?: string) => {
  if (!markdown) return undefined;
  const pattern = /!\[[^\]]*]\(\s*(<([^>]+)>|([^\s)]+))/g;
  for (const match of markdown.matchAll(pattern)) {
    const src = (match[2] ?? match[3])?.trim();
    if (src && !src.startsWith('data:')) return src;
  }
  return undefined;
};

export const isValidUrl = (url?: string) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isEmail = (url: string) =>
  /^mailto:|^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url);

export const extractUrlsFromText = (text?: string) =>
  text?.match(/\bhttps?:\/\/\S+/gi) ?? [];
