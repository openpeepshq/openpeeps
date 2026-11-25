/**
 * Pure markdown formatting for the RN composer toolbar.
 *
 * Extracted from `OpenpeepsMarkdownInput` so the insert/toggle logic can be
 * unit-tested without loading react-native.
 */
export type TextSelection = { start: number; end: number };

export type MarkdownFormat =
  | 'bold'
  | 'italic'
  | 'heading'
  | 'list'
  | 'quote'
  | 'link'
  | 'code';

const LINE_PREFIX: Partial<Record<MarkdownFormat, string>> = {
  heading: '## ',
  list: '- ',
  quote: '> ',
};

const WRAP: Partial<Record<MarkdownFormat, [string, string]>> = {
  bold: ['**', '**'],
  italic: ['*', '*'],
  code: ['`', '`'],
};

export const applyMarkdownFormat = (
  value: string,
  selection: TextSelection,
  kind: MarkdownFormat,
  linkLabel: string
): { value: string; selection: TextSelection } => {
  const from = Math.max(
    0,
    Math.min(selection.start, selection.end, value.length)
  );
  const to = Math.min(
    value.length,
    Math.max(selection.start, selection.end, 0)
  );
  const selected = value.slice(from, to);
  const prefix = LINE_PREFIX[kind];
  if (prefix) {
    const lineStart = from === 0 ? 0 : value.lastIndexOf('\n', from - 1) + 1;
    if (value.slice(lineStart).startsWith(prefix)) {
      return { value, selection: { start: from, end: to } };
    }
    const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
    return {
      value: next,
      selection: { start: from + prefix.length, end: to + prefix.length },
    };
  }
  if (kind === 'link') {
    const isUrl = /^https?:\/\//.test(selected);
    const label = selected && !isUrl ? selected : linkLabel;
    const href = isUrl ? selected : 'https://';
    const insertion = `[${label}](${href})`;
    const next = `${value.slice(0, from)}${insertion}${value.slice(to)}`;
    const cursor = from + insertion.length;
    return { value: next, selection: { start: cursor, end: cursor } };
  }
  const [open, close] = WRAP[kind] ?? ['', ''];
  const insertion = `${open}${selected}${close}`;
  const next = `${value.slice(0, from)}${insertion}${value.slice(to)}`;
  const cursor = selected ? from + insertion.length : from + open.length;
  return { value: next, selection: { start: cursor, end: cursor } };
};
