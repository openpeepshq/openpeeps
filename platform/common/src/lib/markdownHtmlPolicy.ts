/**
 * The markdown HTML sanitization policy: the tag/attribute allowlists and
 * denylists shared by every renderer that turns post markdown into HTML or
 * text — the web (DOMPurify) branch, the Node/email (DOM-free
 * `sanitizeMarkdownHtml`) branch, and the RN (plain-text fallback) renderer.
 * Kept in its own import-free module (plain data, no dependencies) so
 * `platform/common` (web + Node/email), `platform/react` and
 * `platform/rn-components` all import the SAME source of truth instead of
 * hand-copying the lists. `markdownHelpers.ts` re-exports these.
 */

/**
 * Tags and attributes (allowed and forbidden) shared by the web (DOMPurify
 * config), the Node/email sanitizer, and RN (custom HTML token renderers) so
 * all three apply the same policy.
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
  'div',
  'span',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'figure',
] as const;

/**
 * The block-level layout containers in the allowlist. RN renders HTML as
 * plain text and needs this one list to decide which stripped tags become
 * line breaks (side-by-side `<div>` columns must not run together), so it
 * derives its block set from here instead of keeping its own copy.
 */
export const MARKDOWN_HTML_BLOCK_TAGS = [
  'div',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'figure',
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
  'allow',
  'style',
  'class',
  'colspan',
  'rowspan',
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
