import { mentionHandleRegexBase } from '../types';
import {
  MARKDOWN_HTML_ALLOWED_ATTRS,
  MARKDOWN_HTML_ALLOWED_TAGS,
  MARKDOWN_HTML_FORBIDDEN_ATTRS,
  MARKDOWN_HTML_FORBIDDEN_TAGS,
} from './markdownHtmlPolicy';

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

/**
 * Removes inline images (`![alt](url)` and `![alt]`) from markdown while
 * leaving all other formatting intact. Used to keep abbreviated previews to
 * text+basic formatting and put the full (image-bearing) content in an overlay.
 */
export const stripMarkdownImages = (markdown?: string | null): string => {
  if (!markdown) return '';
  return markdown
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/!\[[^\]]*\]/g, '');
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
 * `maxChars` characters at a word boundary. Protected inline constructs — links,
 * images and inline code spans — are never severed: a construct that would not
 * fit whole is omitted (along with what follows), so the result is always valid
 * markdown. Emphasis markers and inline-code backticks left open by a word-boundary
 * cut are closed, so renderers never emit raw markup leaking into copy. An
 * ellipsis is appended only when the content was actually shortened.
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

  return `${closeOpenInline(sliceMarkdownTo(content, maxChars))}…`;
};

/** Inline constructs kept whole so truncation never breaks their syntax. */
const PROTECTED_RE = /(`[^`]+`)|(!\[[^\]]*\]\([^)]*\))|(\[[^\]]*\]\([^)]*\))/g;

/**
 * Walks `content` accumulating plain text (cuttable at a word boundary) and
 * protected spans (kept whole). A protected span that would not fit in the
 * remaining budget ends the snippet instead of being severed.
 */
const sliceMarkdownTo = (content: string, maxChars: number): string => {
  let out = '';
  let pos = 0;

  while (pos < content.length) {
    PROTECTED_RE.lastIndex = pos;
    const match = PROTECTED_RE.exec(content);
    const spanStart = match ? match.index : content.length;

    const plain = content.slice(pos, spanStart);
    const room = maxChars - out.length;
    if (room <= 0) break;

    if (plain.length <= room) {
      out += plain;
    } else {
      out += cutAtWordBoundary(plain, room);
      return out.trimEnd();
    }

    if (match) {
      const span = match[0];
      if (out.length + span.length <= maxChars) {
        out += span;
        pos = match.index + span.length;
      } else {
        // Whole span doesn't fit — drop it (and the rest) rather than sever it.
        return out.trimEnd();
      }
    } else {
      pos = content.length;
    }
  }

  return out.trimEnd();
};

const cutAtWordBoundary = (text: string, max: number): string => {
  const candidate = text.slice(0, max);
  const lastBreak = Math.max(
    candidate.lastIndexOf(' '),
    candidate.lastIndexOf('\n'),
    candidate.lastIndexOf('\t'),
  );
  if (lastBreak > 0) {
    return text.slice(0, lastBreak).trimEnd();
  }
  return candidate;
};

/**
 * Best-effort repair: closes emphasis runs and inline-code backticks left
 * dangling by a cut inside their span. List-marker asterisks at the start of a
 * line are treated as plain text, not emphasis.
 */
const closeOpenInline = (snippet: string): string => {
  const closers: string[] = [];
  let inCode = false;
  let i = 0;

  while (i < snippet.length) {
    const ch = snippet[i];
    const atLineStart = i === 0 || snippet[i - 1] === '\n';

    if (ch === '`') {
      inCode = !inCode;
      i++;
      continue;
    }
    if (inCode) {
      i++;
      continue;
    }

    if (!atLineStart && (ch === '*' || ch === '_' || ch === '~')) {
      let j = i + 1;
      while (j < snippet.length && snippet[j] === ch) j++;
      const marker = snippet.slice(i, j);
      // A lone '~' is not emphasis; treat length-1 tilde as plain text.
      if (ch === '~' && marker.length < 2) {
        i++;
        continue;
      }
      const opener = marker.length >= 2 ? marker.slice(0, 2) : marker;
      if (closers[closers.length - 1] === opener) {
        closers.pop();
      } else {
        closers.push(opener);
      }
      i = j;
      continue;
    }

    i++;
  }

  if (closers.length === 0 && !inCode) return snippet;
  const tail = closers.reverse().join('') + (inCode ? '`' : '');
  return `${snippet}${tail}`;
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

export {
  MARKDOWN_HTML_ALLOWED_ATTRS,
  MARKDOWN_HTML_ALLOWED_TAGS,
  MARKDOWN_HTML_BLOCK_TAGS,
  MARKDOWN_HTML_FORBIDDEN_ATTRS,
  MARKDOWN_HTML_FORBIDDEN_TAGS,
} from './markdownHtmlPolicy';

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
 *
 * We grant a broad Permissions Policy (`allow`) covering autoplay, encrypted
 * media, and picture-in-picture, plus `allow-popups-to-escape-sandbox` in the
 * sandbox itself. Without these, embedded players (YouTube, Vimeo, etc.)
 * report Error 153 (autoplay blocked) because the browser denies the
 * Permissions Policy the player requests.
 */
export const injectIframeSafetyAttrs = (html: string): string => {
  return html.replace(/<iframe([^>]*?)>/gi, (match, attrs: string) => {
    let safeAttrs = attrs;
    if (!/loading\s*=/.test(safeAttrs)) {
      safeAttrs += ' loading="lazy"';
    }
    if (!/sandbox\s*=/.test(safeAttrs)) {
      safeAttrs +=
        ' sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"';
    }
    if (!/referrerpolicy\s*=/.test(safeAttrs)) {
      safeAttrs += ' referrerpolicy="no-referrer"';
    }
    if (!/style\s*=/.test(safeAttrs)) {
      safeAttrs += ' style="max-width:100%;width:100%;border:0;display:block;"';
    }
    if (!/\ballow\s*=/.test(safeAttrs)) {
      safeAttrs += ' allow="autoplay; encrypted-media; picture-in-picture"';
    }
    return `<iframe${safeAttrs}>`;
  });
};

/**
 * Sanitize HTML without a DOM, applying the same tag/attribute allowlists as
 * the browser (DOMPurify) path. Operates tag-by-tag: raw-text disallowed
 * tags are removed along with their body, other disallowed tags lose only
 * their tag, and allowed tags keep only allowlisted attributes whose values
 * are re-escaped so they cannot forge a second attribute.
 *
 * This is the Node-side (no-DOM) equivalent of the DOMPurify call in
 * `compileMarkdownToHtml`, used for server-rendered email embeds and
 * build-time docs where a DOM is unavailable. It matches DOMPurify's
 * *policy* — the tag/attribute allowlists and the default URI scheme policy —
 * on the vector set pinned by the tests, verified against DOMPurify 3.4.17
 * with this package's allowlist config. It is **not** a full HTML parser: it
 * walks tags with a quote-aware scan rather than a real tokenizer, so it does
 * not always reproduce DOMPurify's *output* byte-for-byte on exotic inputs
 * (e.g. it re-serializes an unquoted attribute value containing a space as
 * attribute + orphan text, where a real tokenizer parses the tag differently).
 * That is acceptable here because the input is always HTML our own compiler
 * (marked) produced, and the parity tests pin the security-relevant behavior
 * (script/URI vectors, bare-`<` text) rather than claiming structural output
 * identity.
 */
// C0 controls, space, and the full DOMPurify `ATTR_WHITESPACE` set (NBSP,
// Mongolian vowel separator, U+180E, EN-quad..U+2029, narrow NBSP, ideographic
// space) — every character a URL parser normalizes away before it decides a
// URI's scheme. The range is intentional (that is the whole point);
// `no-control-regex` is a heuristic that misfires on it, so the rule is
// disabled for the literal itself (kept on its own line so the disable stays
// attached to the regex after Prettier wraps the assignment).
const SCHEME_NORMALIZE_RE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0020\u00a0\u1680\u180e\u2000-\u2029\u205f\u3000]/g;

// Decode a character reference exactly once: numeric (`&#106;`, `&#x6a;`) and
// the named references that matter to ASCII content. The full HTML5 table is
// far larger than this, but this covers every reference that could spell a
// scheme or its separators (`&colon;`, `&amp;`, ...). Deliberately decodes
// WITHOUT requiring a trailing `;` and in a SINGLE pass (never re-decoding):
// the HTML5 attribute-value tokenizer decodes `&#106avascript:` and
// `jav&Tab;ascript:` (semicolonless numeric, named whitespace), while
// `&amp;#106;avascript:` must stay inert — a single pass is what makes that
// distinction.
const NAMED_CHAR_REFS: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  colon: ':',
  semicolon: ';',
  tab: '\t',
  newline: '\n',
  lpar: '(',
  rpar: ')',
  equals: '=',
  excl: '!',
  quest: '?',
  sol: '/',
  bsol: '\\',
  plus: '+',
  num: '#',
  percnt: '%',
};

const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);?/g, (m) => {
    const body = m.slice(1, m.endsWith(';') ? -1 : undefined);
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const code = isHex
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : m;
    }
    const named = NAMED_CHAR_REFS[body.toLowerCase()];
    return named ?? m;
  });

// DOMPurify 3.4.17's default URI allowlist (`IS_ALLOWED_URI`), copied
// verbatim so the DOM-free branch applies the EXACT scheme policy the browser
// path enforces: the named schemes http/https/ftp/mailto/tel/callto/sms/cid/
// xmpp/matrix, any relative URL (a leading non-letter, or a letter token not
// immediately followed by a bare `:`), and nothing else. `javascript:`,
// `vbscript:`, `file:`, `blob:`, `about:`, `ms-msdt:`, `search-ms:`,
// `chrome://` and every other scheme fail this test and are dropped — matching
// the browser. (An earlier version allowlisted only the javascript/vbscript/
// data cases, which let file:/blob:/about:/protocol-handler schemes through on
// the email path; this replaces it with the full default policy.)
// The hyphen is placed last in each class so it is a literal without an
// escape: in the negated class a mid-class `-` would pair `.` and `:` into a
// range that swallows `/` and the digits, breaking the URI-boundary test
// (relative URLs fail, protocol-handler schemes survive). Reordering is
// semantically identical (verified against the escaped form) but needs no
// `\-` and no eslint-disable.
const IS_ALLOWED_URI =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.-]+(?:[^a-z+:.-]|$))/i;

// DOMPurify's `DEFAULT_DATA_URI_TAGS`: the only tags whose `src` may legally
// carry a `data:` payload. `a` (href) and `iframe` are NOT in this set, so a
// `data:` URI on their `src`/`href` is dropped, matching the browser. The
// match is tag-based, not a `data:image/*` prefix test — a browser does not
// execute a `data:` payload inside `<img>`/`<video>`/`<source>`, so DOMPurify
// keeps any `data:` on those.
const DATA_URI_SRC_TAGS = new Set([
  'audio',
  'video',
  'img',
  'source',
  'image',
  'track',
]);

// Decide whether a URI-carrying attribute value is allowed, mirroring
// DOMPurify's default URI policy (`_isValidAttribute`): decode entities and
// strip the whitespace/control chars a URL parser normalizes (exactly as
// DOMPurify tests the decoded value with `ATTR_WHITESPACE` removed), then pass
// the value through the `IS_ALLOWED_URI` allowlist, with the `data:`-on-media-
// `src` special case. Decoding is a safe superset of what the browser does at
// parse time: it also neutralizes entity-obfuscated `javascript:`/`vbscript:`.
const isAllowedUri = (
  value: string,
  tagName: string,
  attrName: string,
): boolean => {
  const normalized = decodeHtmlEntities(value).replace(SCHEME_NORMALIZE_RE, '');
  if (IS_ALLOWED_URI.test(normalized)) {
    return true;
  }
  return (
    (attrName === 'src' || attrName === 'href') &&
    normalized.startsWith('data:') &&
    DATA_URI_SRC_TAGS.has(tagName)
  );
};

// Re-serialize an allowlisted attribute value into a double-quoted attribute,
// matching DOMPurify's output: decode the value to its literal text (so an
// already-encoded `&amp;` does not get double-encoded), then re-escape `&`,
// `"`, and `<`. The `"` escaping is what closes the class-1 re-serialization
// hole — a single-quoted value like `title='x" href="javascript:…'` must not
// be able to forge a second attribute; `&` and `<` escaping keeps the value
// inert text.
const escapeAttrValue = (value: string): string => {
  const decoded = decodeHtmlEntities(value);
  return decoded
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
};

export const sanitizeMarkdownHtml = (html: string): string => {
  const allowed = new Set<string>(MARKDOWN_HTML_ALLOWED_TAGS);
  const allowedAttrs = new Set<string>(MARKDOWN_HTML_ALLOWED_ATTRS);
  const forbiddenTags = new Set<string>(MARKDOWN_HTML_FORBIDDEN_TAGS);
  const forbiddenAttrs = new Set<string>(MARKDOWN_HTML_FORBIDDEN_ATTRS);

  // Void elements never have a closing tag, so "everything they contain" is
  // just the rest of the tag itself.
  const VOID_TAGS = new Set<string>([
    'br',
    'img',
    'hr',
    'source',
    'input',
    'area',
    'base',
    'col',
    'embed',
    'link',
    'meta',
    'wbr',
  ]);

  // HTML5 raw-text (and script-data) elements: when unclosed, their "content"
  // runs to the end of the document in a real parser, so an unclosed one
  // swallows the rest of the input rather than leaking it as text. (`form`
  // and `object` are *not* raw-text: unclosed, they keep their content as
  // text, so only script and style from the forbidden list go here.)
  const RAW_TEXT_TAGS = new Set<string>([
    'script',
    'style',
    'noscript',
    'template',
    'plaintext',
    'xmp',
    'textarea',
    'title',
  ]);

  let out = '';
  let rest = html;

  while (true) {
    const lt = rest.indexOf('<');
    if (lt === -1) {
      out += rest;
      break;
    }
    out += rest.slice(0, lt);
    rest = rest.slice(lt);

    // Comments: drop entirely (they can't carry visible content or script).
    // A `-->` terminator is required: an *unclosed* comment drops the whole
    // remainder of the input (a real parser would keep it as ordinary text
    // running to end of input). That tail loss is an accepted approximation,
    // not a script concern — comments are stripped either way.
    if (rest.startsWith('<!--')) {
      const end = rest.indexOf('-->');
      rest = end === -1 ? '' : rest.slice(end + 3);
      continue;
    }

    const tag = parseTagAt(rest);
    if (tag === null) {
      // A `<` that does not begin a well-formed tag (e.g. the bare `<` in
      // "3 < 5", a `< b`, or an unterminated attribute quote). Escape it as
      // `&lt;` and keep scanning, matching DOMPurify, instead of aborting and
      // truncating the whole remainder of the document.
      out += '&lt;';
      rest = rest.slice(1);
      continue;
    }
    const { name, isClosing, attrs, tagLength, selfClosing } = tag;
    rest = rest.slice(tagLength);

    if (!name) {
      continue; // not a real tag; drop
    }

    if (!allowed.has(name) || forbiddenTags.has(name)) {
      // Disallowed tag. Raw-text elements (script/style/...) carry their
      // body up to the close tag (or the end of the document when unclosed,
      // as in a real parser) — swallow that body so a `<script>` payload
      // can't leak out as plain text. Every other disallowed element only
      // loses its tag: its content is ordinary markup and keeps being
      // scanned (a stray matching close tag is dropped when reached),
      // which is also what the browser does.
      if (!isClosing && !VOID_TAGS.has(name) && RAW_TEXT_TAGS.has(name)) {
        const closeRe = new RegExp(`</${name}\\s*>`, 'gi');
        const m = closeRe.exec(rest);
        rest = m ? rest.slice(m.index + m[0].length) : '';
      }
      continue;
    }

    // Allowed tag: rebuild with only allowlisted, non-forbidden attributes.
    if (isClosing) {
      out += `</${name}>`;
      continue;
    }
    const kept: string[] = [];
    // A real DOM keeps the first-seen attribute for a repeated (or
    // case-variant) name — `DOMPurify`'s `setAttribute` overwrites onto the
    // existing node, so a later duplicate never survives. Track the names we
    // have already kept (the parser lowercases them, so `class`/`CLASS`
    // collapse together) and skip any repeat to match the browser's
    // first-wins behavior instead of emitting the attribute twice.
    const keptNames = new Set<string>();
    for (const { attrName, attrValue, hasValue } of attrs) {
      if (forbiddenAttrs.has(attrName) || !allowedAttrs.has(attrName)) {
        continue;
      }
      // URI-carrying attributes must pass DOMPurify's default URI policy —
      // the same `IS_ALLOWED_URI` allowlist the browser path applies — so the
      // email path enforces one scheme policy instead of a narrower
      // javascript/data-only one (which let file:/blob:/about:/protocol-
      // handler schemes through).
      if (
        (attrName === 'href' || attrName === 'src') &&
        hasValue &&
        !isAllowedUri(attrValue, name, attrName)
      ) {
        continue;
      }
      if (keptNames.has(attrName)) {
        continue;
      }
      keptNames.add(attrName);
      if (hasValue) {
        kept.push(`${attrName}="${escapeAttrValue(attrValue)}"`);
      } else {
        kept.push(attrName);
      }
    }
    const slash = selfClosing ? ' /' : '';
    out +=
      kept.length > 0
        ? `<${name} ${kept.join(' ')}${slash}>`
        : `<${name}${slash}>`;
  }

  return out;
};

/**
 * Parse a single HTML tag starting at index 0 of `s`. Returns the tag name,
 * whether it is a closing tag, its attributes, the number of characters
 * consumed, and whether it was self-closing. Returns `null` if no valid tag
 * end is found. A quote-aware scan is used so a `>` inside a quoted attribute
 * value does not terminate the tag early.
 */
const parseTagAt = (
  s: string,
): {
  name: string;
  isClosing: boolean;
  selfClosing: boolean;
  attrs: { attrName: string; attrValue: string; hasValue: boolean }[];
  tagLength: number;
} | null => {
  const isClosing = s.startsWith('</');
  let i = isClosing ? 2 : 1;
  const nameMatch = s.slice(i).match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  if (!nameMatch) return null;
  const name = nameMatch[1].toLowerCase();
  i += nameMatch[0].length;

  const attrs: { attrName: string; attrValue: string; hasValue: boolean }[] =
    [];
  let end = -1;
  let selfClosing = false;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '>' || (ch === '/' && s[i + 1] === '>')) {
      if (ch === '/') selfClosing = true;
      end = i + (ch === '/' ? 2 : 1);
      break;
    }
    if (ch === '"' || ch === "'") {
      const closeIdx = s.indexOf(ch, i + 1);
      if (closeIdx === -1) return null;
      i = closeIdx + 1;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      const m = /^[a-zA-Z][a-zA-Z0-9:-]*/.exec(s.slice(i));
      if (m) {
        const attrName = m[0].toLowerCase();
        i += m[0].length;
        let j = i;
        while (j < s.length && s[j] === ' ') j += 1;
        if (s[j] === '=') {
          j += 1;
          while (j < s.length && s[j] === ' ') j += 1;
          let value = '';
          if (s[j] === '"' || s[j] === "'") {
            const q = s[j];
            const closeIdx = s.indexOf(q, j + 1);
            if (closeIdx === -1) return null;
            value = s.slice(j + 1, closeIdx);
            i = closeIdx + 1;
          } else {
            const v = /^[^\s>]+/.exec(s.slice(j));
            if (!v) {
              i = j;
            } else {
              value = v[0];
              i = j + v[0].length;
            }
          }
          attrs.push({ attrName, attrValue: value, hasValue: true });
          j = i;
          while (j < s.length && s[j] === ' ') j += 1;
          i = j;
          continue;
        }
        attrs.push({ attrName, attrValue: '', hasValue: false });
        continue;
      }
    }
    i += 1;
  }
  if (end === -1) return null;
  return { name, isClosing, selfClosing, attrs, tagLength: end };
};
