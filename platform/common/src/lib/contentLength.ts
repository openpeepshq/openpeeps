/**
 * Visible-text measurement for the post content budget.
 *
 * Counts what a reader sees, not the raw markdown source:
 * - fenced code counts its content verbatim (it renders as visible code)
 * - links and images count their text/alt, not the URL
 * - structural line syntax (table cells/pipes, list markers, setext
 *   underlines, thematic breaks, headings, blockquotes) and HTML tags
 *   render no characters and do not count
 * - whitespace runs collapse and line edges trim, so the count tracks
 *   what renders
 *
 * This is a budget estimate, not a markdown parser: unbounded content is
 * guarded by the raw-length cap (`POST_MAX_RAW_LENGTH`), not by this
 * function.
 */
const FENCE_RE = /^[ \t]*```[^\n]*\n?([\s\S]*?)^[ \t]*```[ \t]*$/gm;

// Built from a string, not a regex literal: ESLint's no-control-regex
// rejects control characters in regex sources. U+FFFE is a noncharacter
// no renderer emits, and stray occurrences are stripped from the content
// before fencing, so it cannot collide with real input.
const FENCE_SENTINEL_RE = () => new RegExp('\\uFFFE(\\d+)\\uFFFE', 'g');

/**
 * A line that renders nothing: table delimiter rows (`| --- | --- |`),
 * setext underlines (`---`, `===`), and thematic breaks (`---`, `***`,
 * `___`). The character class mirrors their allowed symbols; `-` is last
 * so it cannot form a range.
 */
const INVISIBLE_LINE_RE = /^[ \t]*\|?[ \t]*[-=*_][ \t:|=*_-]*\|?[ \t]*$/;

export const visibleTextLength = (markdown?: string | null): number => {
  if (!markdown) return 0;
  // Stray sentinels in user content must not collide with the fence
  // sentinel (U+FFFE is a noncharacter no renderer emits).
  let text = markdown
    .replace(/\r\n?/g, '\n')
    .replaceAll('\uFFFE', '')
    .replaceAll('\u0000', '');
  // Fenced code renders verbatim, so hold its content aside while the
  // line-structural passes run on the surrounding text.
  const fenced: string[] = [];
  text = text.replace(FENCE_RE, (_match, content: string) => {
    fenced.push(content);
    return `\uFFFE${fenced.length - 1}\uFFFE`;
  });
  // Inline code counts its content, not the backticks.
  text = text.replace(/`([^`]+)`/g, '$1');
  // Autolinks: the URL is the visible text.
  text = text.replace(/<(https?:\/\/[^>\s]+|mailto:[^>\s]+)>/gi, '$1');
  // Images: count the alt text, drop the marker and URL.
  text = text.replace(/!\[([^\]]*)\]\(((?:[^()]+|\([^()]*\))*)\)/g, '$1');
  // Links: count the text, drop the URL (one level of nested parens ok).
  text = text.replace(/\[([^\]]+)\]\(((?:[^()]+|\([^()]*\))*)\)/g, '$1');
  // Reference-style links: count the text, drop the reference.
  text = text.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1');
  // HTML tags: drop the tags, keep the inner text.
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  text = text
    .split('\n')
    .map((line) => {
      if (INVISIBLE_LINE_RE.test(line)) return '';
      return (
        line
          // Heading and blockquote markers.
          .replace(/^[ \t]*(?:#{1,6}|>)[ \t]*/, '')
          // List markers ("-", "*", "+", "1.", "1)").
          .replace(/^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+/, '')
          // Table cells: the pipes and their padding are syntax.
          .replace(/^[ \t]*\|/, '')
          .replace(/\|[ \t]*$/, '')
          .replace(/\|/g, ' ')
          .replace(/^[ \t]+|[\t ]+$/g, '')
      );
    })
    .filter((line) => line.length > 0)
    .join('\n');
  // Emphasis/strikethrough markers. `_` inside a word (snake_case) is kept.
  text = text.replace(/[*~]{1,3}/g, '');
  text = text.replace(/(^|\s)_{1,3}(\S)/gm, '$1$2');
  text = text.replace(/(\S)_{1,3}(\s|$)/gm, '$1$2');
  // Whitespace runs collapse to single spaces (the renderer collapses
  // them), so the count tracks what renders.
  text = text.replace(/[\t ]{2,}/g, ' ');
  // Restore the fenced code content verbatim.
  text = text.replace(FENCE_SENTINEL_RE(), (_match, index: string) => {
    return fenced[Number(index)] ?? '';
  });
  // Count code points so emoji and other astral characters cost what they
  // render, not their UTF-16 surrogate pair.
  return [...text].length;
};

/** Visible-text budget for note/question content. */
export const POST_MAX_VISIBLE_LENGTH = 500;
/** Raw markdown backstop for note/question content. */
export const POST_MAX_RAW_LENGTH = 5000;

/**
 * Whitespace-only content is measured as empty (nothing renders), so the
 * same "is there anything to send" test must ignore whitespace everywhere
 * a composer or schema checks it.
 */
export const hasVisibleText = (content?: string | null): boolean =>
  visibleTextLength(content) > 0;

/** True when note/question content fits the visible + raw budgets. */
export const postContentWithinBudget = (content?: string | null): boolean => {
  const raw = content ?? '';
  return (
    visibleTextLength(raw) <= POST_MAX_VISIBLE_LENGTH &&
    raw.length <= POST_MAX_RAW_LENGTH
  );
};

/**
 * Shared composer submit gate over the visible budget. Question composers
 * need visible text for their poll to make sense; note composers accept an
 * attachment instead. In-flight state (submitting, pending uploads,
 * audience/group requirements) stays at the call site.
 */
export const canSubmitPostContent = ({
  visibleContentLength,
  attachmentsLength,
  composerType,
  pollOptionsValid = true,
}: {
  visibleContentLength: number;
  attachmentsLength: number;
  composerType?: 'note' | 'question';
  pollOptionsValid?: boolean;
}): boolean =>
  composerType === 'question'
    ? visibleContentLength > 0 &&
      visibleContentLength <= POST_MAX_VISIBLE_LENGTH &&
      pollOptionsValid
    : visibleContentLength <= POST_MAX_VISIBLE_LENGTH &&
      (visibleContentLength > 0 || attachmentsLength > 0);
