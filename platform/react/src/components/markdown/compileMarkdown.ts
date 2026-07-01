import { marked, Renderer, type Tokens } from 'marked';
import { linkOpensInNewTab } from './linkTargets';

export type CompileMarkdownOptions = {
  origin?: string;
  newTab?: boolean;
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

export const compileMarkdownToHtml = (
  source: string,
  options: CompileMarkdownOptions = {},
): string => {
  const { origin, newTab = false } = options;
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

    let out = `<a href="${cleaned}"`;
    if (title) {
      out += ` title="${escapeHtml(title)}"`;
    }
    if (linkOpensInNewTab(cleaned, origin, newTab)) {
      out += ' target="_blank" rel="noopener noreferrer"';
    }
    out += `>${text}</a>`;
    return out;
  };

  return marked.parse(source, { renderer, async: false }) as string;
};
