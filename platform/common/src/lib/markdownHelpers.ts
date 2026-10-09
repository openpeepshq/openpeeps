import { mentionHandleRegexBase } from '../types';

export interface MarkdownRenderProps {
  source?: string;
  mentions?: MentionProfileRef[];
  linkPreviewMode?: 'prepend' | 'append' | 'inline' | 'none';
  /** When true, all links open in a new tab (web) / system browser (RN). */
  newTab?: boolean | ((link: string) => boolean);
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type MentionProfileRef = {
  profile: { handle?: string | null; displayName?: string | null };
};

const mentionPrefix = '(^|[\\s(>])';
const mentionSuffix = '(?=\\s|$|[.,!?;:])';

/**
 * Turn `@handle` / known `@displayName` into markdown profile links.
 * Display names are matched exactly (longest first) so apostrophes and other
 * non-letter characters still count when that profile is in `mentions`.
 * Bare `@handle` tokens use the allowed handle charset (letters, digits, `_`, `-`).
 */
export const linkProfileMentions = (
  source: string,
  mentions: MentionProfileRef[] = [],
): string => {
  const aliases = mentions.flatMap(({ profile }) => {
    const handle = profile.handle?.trim();
    if (!handle) return [];
    const names = new Set<string>([handle]);
    const displayName = profile.displayName?.trim();
    if (displayName) names.add(displayName);
    return [...names].map((name) => ({ name, handle }));
  });

  aliases.sort((a, b) => b.name.length - a.name.length);

  let text = source;
  for (const { name, handle } of aliases) {
    const pattern = new RegExp(
      `${mentionPrefix}@(${escapeRegExp(name)})${mentionSuffix}`,
      'gi',
    );
    text = text.replace(
      pattern,
      (_full, prefix: string, mentioned: string) =>
        `${prefix}[@${mentioned}](/@${handle})`,
    );
  }

  return text.replace(
    new RegExp(mentionHandleRegexBase, 'g'),
    (_full, prefix: string, handle: string) =>
      `${prefix}[@${handle}](/@${handle})`,
  );
};

/**
 * Pre-process markdown source: convert `@handle` mentions into markdown
 * profile links. Hashtag conversion is handled per-platform (web regex vs.
 * markdown-it plugin) because the resulting URL schemes differ.
 * Shared by web and RN renderers so both start from the same text.
 */
export const preprocessMarkdownSource = linkProfileMentions;

export const matchMentionHandles = (text?: string | null): string[] => {
  if (!text) return [];
  const handles = new Set<string>();
  for (const match of text.matchAll(new RegExp(mentionHandleRegexBase, 'g'))) {
    const handle = match[2];
    if (handle) handles.add(handle);
  }
  return [...handles];
};

/** Readable text for a shortened preview. Drops markdown marks, keeps words. */
export const markdownPlainText = (markdown?: string | null): string => {
  if (!markdown) return '';
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const firstNWords = (markdown: string | undefined, n: number) => {
  if (!markdown) return '';
  // Regular expression to match words and markdown links.
  const regex = /\[.*?\]\(.*?\)|(\w+)/g;

  let wordCount = 0;
  const firstTwelveWords = [];
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    // Check if the match is a link or a regular word.
    if (match[1]) {
      // It's a regular word
      firstTwelveWords.push(match[1]);
      wordCount++;
    } else {
      // It's a markdown link - treat it as one word
      firstTwelveWords.push(match[0]); // Add the entire link string
      wordCount++;
    }

    if (wordCount >= n) {
      break;
    }
  }

  return firstTwelveWords.join(' ');
};

/**
 * Truncates markdown to at most `maxBlocks` block-level regions, then to
 * `maxChars` characters at a word boundary. Preserves punctuation and inline
 * markdown formatting (links, bold, etc.). An ellipsis is appended only when
 * the content was actually shortened.
 */
export const truncateMarkdown = (
  markdown: string | undefined,
  maxBlocks: number,
  maxChars: number,
): string => {
  if (!markdown) return '';

  const blocks = markdown
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return '';

  const hadMoreBlocks = blocks.length > maxBlocks;
  const content = blocks.slice(0, maxBlocks).join('\n\n');

  if (content.length <= maxChars) {
    return hadMoreBlocks ? `${content}…` : content;
  }

  const candidate = content.slice(0, maxChars);
  const lastBreak = Math.max(
    candidate.lastIndexOf(' '),
    candidate.lastIndexOf('\n'),
    candidate.lastIndexOf('\t'),
  );

  if (lastBreak > 0) {
    return `${content.slice(0, lastBreak).trimEnd()}…`;
  }

  return `${candidate}…`;
};

/** Average adult reading speed (words per minute). */
const DEFAULT_WORDS_PER_MINUTE = 210;

/**
 * Estimate reading time for a markdown article. Strips markdown syntax
 * before counting words, then divides by the words-per-minute rate.
 * Always returns at least 1 for non-empty content.
 */
export const minutesToRead = (
  markdown: string | undefined,
  wordsPerMinute = DEFAULT_WORDS_PER_MINUTE,
): number => {
  if (!markdown) return 0;
  const plainText = markdownPlainText(markdown);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  return wordCount === 0
    ? 0
    : Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

/* ------------------------------------------------------------------ */
/* Shared link utilities                                              */
/* ------------------------------------------------------------------ */

/**
 * True when `href` points to a different origin than `origin`.
 * Same logic as the web `linkTargets.isExternalLink`.
 */
export const isExternalLink = (href: string, origin?: string): boolean => {
  if (!href || /^(mailto:|tel:|#)/.test(href)) {
    return false;
  }
  if (href.startsWith('/') && !href.startsWith('//')) {
    return false;
  }
  if (!origin) {
    return !href.startsWith('/');
  }
  try {
    return new URL(href, origin).origin !== origin;
  } catch {
    return !href.startsWith('/');
  }
};

/** Convert a same-origin path or URL to a `goto:` deep-link for RN navigation. */
export const toGotoUrl = (url: string, origin: string): string => {
  if (url.includes('goto:/')) {
    return url;
  }
  if (url.startsWith('/') && !url.startsWith('//')) {
    return `goto:${url}`;
  }
  try {
    const urlObj = new URL(url);
    if (urlObj.origin === origin) {
      return `goto:${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
    }
  } catch {
    // fall through
  }
  return url;
};

/* ------------------------------------------------------------------ */
/* HTML sanitization helpers (shared allowlist + iframe safety)       */
/* ------------------------------------------------------------------ */

/**
 * Tags, attrs and forbits shared by both the web (DOMPurify config) and
 * RN (custom HTML token renderers) so both platforms apply the same policy.
 */
export const MARKDOWN_HTML_ALLOWED_TAGS = [
  'b',
  'i',
  'em',
  'strong',
  'a',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'iframe',
  'video',
  'source',
  'picture',
  'figcaption',
] as const;

export const MARKDOWN_HTML_ALLOWED_ATTRS = [
  'href',
  'src',
  'title',
  'alt',
  'target',
  'rel',
  'width',
  'height',
  'loading',
  'sandbox',
  'frameborder',
  'allowfullscreen',
  'referrerpolicy',
  'style',
] as const;

export const MARKDOWN_HTML_FORBIDDEN_TAGS = [
  'script',
  'style',
  'form',
  'object',
  'embed',
] as const;

export const MARKDOWN_HTML_FORBIDDEN_ATTRS = [
  'onload',
  'onerror',
  'onclick',
  'onmouseover',
] as const;

/** Simple `<iframe>` tag detector for extracting embed URLs from raw HTML. */
const IFRAME_SRC_RE =
  /<iframe\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>/gi;

/** Extract all iframe `src` URLs found in an HTML string. */
export const extractIframeSrcs = (html: string): string[] => {
  const srcs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = IFRAME_SRC_RE.exec(html)) !== null) {
    srcs.push(match[1] ?? match[2] ?? '');
  }
  return srcs;
};

/**
 * Inject safety attributes onto `<iframe>` tags so they can't break out of
 * their container or execute script navigation. Runs after sanitization
 * (so attackers can't smuggle attributes through), before DOM injection.
 */
export const injectIframeSafetyAttrs = (html: string): string => {
  return html.replace(/<iframe([^>]*?)>/gi, (match, attrs: string) => {
    let safeAttrs = attrs;
    if (!/loading\s*=/.test(safeAttrs)) {
      safeAttrs += ' loading="lazy"';
    }
    if (!/sandbox\s*=/.test(safeAttrs)) {
      safeAttrs +=
        ' sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"';
    }
    if (!/referrerpolicy\s*=/.test(safeAttrs)) {
      safeAttrs += ' referrerpolicy="no-referrer"';
    }
    if (!/style\s*=/.test(safeAttrs)) {
      safeAttrs += ' style="max-width:100%;width:100%;border:0;display:block;"';
    }
    return `<iframe${safeAttrs}>`;
  });
};
