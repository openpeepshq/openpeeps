import { truncateText } from '@openpeepshq/common/lib';

const HTTP_URL_RE = /^https?:\/\/\S+$/i;
const MARKDOWN_LINK_RE = /^\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/i;

export type ProfileFieldLink = {
  href: string;
  display: string;
};

/** Origin + first path segment, then ellipsis — e.g. `https://www.linkedin.com/in...`. */
export const truncateUrl = (url: string, maxLength = 36): string => {
  if (url.length <= maxLength) return url;
  try {
    const parsed = new URL(url);
    const firstSeg = parsed.pathname.split('/').filter(Boolean)[0];
    if (firstSeg) {
      const withSeg = `${parsed.origin}/${firstSeg}`;
      if (withSeg.length <= maxLength) return `${withSeg}...`;
    }
    return `${parsed.origin}/...`;
  } catch {
    return truncateText(url, maxLength);
  }
};

/** If the field value is a URL (or a markdown link to one), return href + short label. */
export const profileFieldLink = (value: string): ProfileFieldLink | null => {
  const trimmed = value.trim();
  const markdown = trimmed.match(MARKDOWN_LINK_RE);
  if (markdown) {
    const text = markdown[1] ?? '';
    const href = markdown[2] ?? '';
    const display =
      HTTP_URL_RE.test(text) || text === href ? truncateUrl(href) : text;
    return { href, display };
  }
  if (HTTP_URL_RE.test(trimmed)) {
    return { href: trimmed, display: truncateUrl(trimmed) };
  }
  return null;
};
