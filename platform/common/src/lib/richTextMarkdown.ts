/**
 * Markdown helpers for the rich text editor. The document is TipTap JSON;
 * stored posts stay Markdown.
 */

export type RichTextMark = {
  type?: string;
  attrs?: { href?: string | null };
};

export type RichTextNode = {
  type?: string;
  text?: string;
  attrs?: { level?: number; href?: string | null };
  marks?: RichTextMark[];
  content?: RichTextNode[];
};

const isRecord = (value: unknown): value is RichTextNode =>
  typeof value === 'object' && value !== null;

/** Drop one trailing newline so an empty document stays an empty string. */
export const normalizeRichTextMarkdown = (markdown: string): string =>
  markdown.replace(/\u00a0/g, ' ').replace(/\n+$/, '');

/**
 * Raw HTML the editor schema does not keep. Those documents stay in the
 * Markdown source field so an edit does not strip embeds or tables.
 */
export const richTextNeedsSourceMode = (
  markdown: string,
  options?: { fencedCode?: boolean },
): boolean =>
  /<(iframe|video|table|thead|script|style)\b/i.test(markdown) ||
  (options?.fencedCode === true && markdown.includes('```'));

/**
 * Empty string clears a link. `null` means the address is not allowed.
 * Relative paths and http(s)/mailto only — no script or data URLs.
 */
export const safeRichTextHref = (raw: string): string | null => {
  const href = raw.trim();
  if (!href) return '';
  if (
    href.startsWith('/') &&
    !href.startsWith('//') &&
    !href.includes(' ') &&
    !href.includes('\\')
  ) {
    return href;
  }
  try {
    const url = new URL(href);
    if (
      url.protocol === 'http:' ||
      url.protocol === 'https:' ||
      url.protocol === 'mailto:'
    ) {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
};

const escapeText = (text: string): string =>
  text.replace(/[\\`*_~[\]]/g, (char) => `\\${char}`);

const inlineCode = (text: string): string => {
  const fence = text.includes('`') ? '``' : '`';
  const spaced =
    text.startsWith('`') || text.endsWith('`') ? ` ${text} ` : text;
  return `${fence}${spaced}${fence}`;
};

const renderInline = (node: RichTextNode): string => {
  if (node.type === 'hardBreak') return '  \n';
  if (node.type !== 'text') {
    return (node.content ?? []).map(renderInline).join('');
  }
  const marks = node.marks ?? [];
  if (marks.some((mark) => mark.type === 'code')) {
    return inlineCode(node.text ?? '');
  }
  let text = escapeText(node.text ?? '');
  if (marks.some((mark) => mark.type === 'bold')) text = `**${text}**`;
  if (marks.some((mark) => mark.type === 'italic')) text = `*${text}*`;
  if (marks.some((mark) => mark.type === 'strike')) text = `~~${text}~~`;
  const href = marks.find((mark) => mark.type === 'link')?.attrs?.href;
  if (href) text = `[${text}](${href})`;
  return text;
};

const renderListItem = (item: RichTextNode, marker: string): string => {
  const inner = (item.content ?? [])
    .map((child) => renderBlock(child))
    .filter((block) => block.length > 0)
    .join('\n\n');
  const lines = inner.split('\n');
  return lines
    .map((line, index) => (index === 0 ? `${marker} ${line}` : `  ${line}`))
    .join('\n');
};

const renderBlock = (node: RichTextNode): string => {
  switch (node.type) {
    case 'paragraph':
      return (node.content ?? []).map(renderInline).join('');
    case 'heading': {
      const level = Math.min(6, Math.max(1, node.attrs?.level ?? 1));
      const text = (node.content ?? []).map(renderInline).join('');
      return `${'#'.repeat(level)} ${text}`;
    }
    case 'blockquote': {
      const inner = (node.content ?? [])
        .map((child) => renderBlock(child))
        .filter((block) => block.length > 0)
        .join('\n\n');
      return inner
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    }
    case 'bulletList':
    case 'taskList':
      return (node.content ?? [])
        .map((item) => renderListItem(item, '-'))
        .join('\n');
    case 'orderedList':
      return (node.content ?? [])
        .map((item, index) => renderListItem(item, `${index + 1}.`))
        .join('\n');
    case 'codeBlock': {
      const code = (node.content ?? [])
        .map((child) => child.text ?? '')
        .join('');
      return `\`\`\`\n${code}\n\`\`\``;
    }
    case 'horizontalRule':
      return '---';
    default:
      return (node.content ?? [])
        .map((child) => renderBlock(child))
        .filter((block) => block.length > 0)
        .join('\n\n');
  }
};

/** Serialize a TipTap document to the Markdown subset OpenPeeps stores. */
export const richTextJsonToMarkdown = (doc: unknown): string => {
  if (!isRecord(doc) || doc.type !== 'doc') return '';
  const markdown = (doc.content ?? [])
    .map((node) => renderBlock(node))
    .filter((block) => block.length > 0)
    .join('\n\n');
  return normalizeRichTextMarkdown(markdown);
};
