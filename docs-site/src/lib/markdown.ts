import { marked, Renderer, type Tokens } from 'marked';

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

export const compileMarkdownToHtml = (source: string): string => {
  const renderer = new Renderer();

  renderer.link = function (
    this: Renderer,
    { href, title, tokens }: Tokens.Link,
  ) {
    const text = this.parser.parseInline(tokens);
    const cleaned = href ? cleanHref(href) : null;
    if (!cleaned) return text;

    let out = `<a href="${cleaned}"`;
    if (title) out += ` title="${escapeHtml(title)}"`;
    if (/^https?:/i.test(cleaned)) {
      out += ' target="_blank" rel="noopener noreferrer"';
    }
    out += `>${text}</a>`;
    return out;
  };

  return marked.parse(source, { renderer, async: false }) as string;
};

export const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
