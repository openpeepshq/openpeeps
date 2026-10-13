import { marked, Renderer, type Tokens } from 'marked';
import DOMPurify from 'dompurify';
import {
  isExternalLink,
  injectIframeSafetyAttrs,
  MARKDOWN_HTML_ALLOWED_TAGS,
  MARKDOWN_HTML_ALLOWED_ATTRS,
  MARKDOWN_HTML_FORBIDDEN_TAGS,
  MARKDOWN_HTML_FORBIDDEN_ATTRS,
} from '@openpeepshq/common/lib';

export type CompileMarkdownOptions = {
  origin?: string;
  /** When true (default), the compiled HTML is sanitized before output. */
  newTab?: boolean | ((link: string) => boolean);
  sanitize?: boolean;
};

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const cleanHref = (href: string): string | null => {
  try {
    return encodeURI(href).replace(/%25/g, '%');
  } catch {
    return null;
  }
};

const resolveNewTabFlag = (
  newTab: boolean | ((link: string) => boolean) | undefined,
  href: string,
): boolean => {
  if (typeof newTab === 'function') return newTab(href);
  return newTab ?? false;
};

export const compileMarkdownToHtml = (
  source: string,
  options: CompileMarkdownOptions = {},
): string => {
  const { origin, newTab = false, sanitize: shouldSanitize = true } = options;
  const renderer = new Renderer();

  renderer.link = function (
    this: Renderer,
    { href, title, tokens }: Tokens.Link,
  ) {
    const text = this.parser.parseInline(tokens);
    const cleaned = href ? cleanHref(href) : null;
    if (!cleaned) {
      return text;
    }

    const opensNewTab = resolveNewTabFlag(newTab, cleaned);

    let out = `<a href="${cleaned}"`;
    if (title) {
      out += ` title="${escapeHtml(title)}"`;
    }
    if (isExternalLink(cleaned, origin) || opensNewTab) {
      out += ' target="_blank" rel="noopener noreferrer"';
    }
    out += `>${text}</a>`;
    return out;
  };

  let html = marked.parse(source, { renderer, async: false }) as string;

  if (shouldSanitize) {
    // DOMPurify requires a DOM and is effectively browser-only: in Node
    // (build-time docs manifest, server-side emails) DOMPurify.sanitize is
    // not a function, so skip it. That HTML is re-sanitized at render time
    // via CompiledMarkdown in the browser.
    if (typeof DOMPurify.sanitize === 'function') {
      html = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [...MARKDOWN_HTML_ALLOWED_TAGS],
        ALLOWED_ATTR: [...MARKDOWN_HTML_ALLOWED_ATTRS],
        FORBID_TAGS: [...MARKDOWN_HTML_FORBIDDEN_TAGS],
        FORBID_ATTR: [...MARKDOWN_HTML_FORBIDDEN_ATTRS],
      });
    }
    // Inject sandbox/loading/containment attrs on iframes after sanitization
    // so attackers can't smuggle attributes through DOMPurify's allowlist.
    html = injectIframeSafetyAttrs(html);
  }

  return html;
};
