/**
 * Visible-text measurement for the post content budget.
 *
 * Counts what a reader sees, not the raw markdown source:
 * - fenced code counts its content (it renders as visible code)
 * - links and images count their text/alt, not the URL
 * - HTML tags and formatting markers (headings, blockquotes, emphasis)
 *   do not count
 *
 * This is a budget estimate, not a markdown parser: it errs toward counting,
 * and unbounded content is guarded by the raw-length cap
 * (`POST_MAX_RAW_LENGTH`), not by this function.
 */
export const visibleTextLength = (markdown?: string | null): number => {
  if (!markdown) return 0;
  let text = markdown;
  // Fenced code: count the content, drop the fence lines.
  text = text.replace(/^[ \t]*```[^\n]*\n?([\s\S]*?)^[ \t]*```[ \t]*$/gm, '$1');
  // Inline code: count the content, drop the backticks.
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
  // Line-leading heading/blockquote markers.
  text = text.replace(/^[ \t]*(?:#{1,6}|>)[ \t]*/gm, '');
  // Emphasis/strikethrough markers. `_` inside a word (snake_case) is kept.
  text = text.replace(/[*~]{1,3}/g, '');
  text = text.replace(/(^|\s)_{1,3}(\S)/gm, '$1$2');
  text = text.replace(/(\S)_{1,3}(\s|$)/gm, '$1$2');
  return text.length;
};

/** Visible-text budget for note/question content. */
export const POST_MAX_VISIBLE_LENGTH = 500;
/** Raw markdown backstop for note/question content. */
export const POST_MAX_RAW_LENGTH = 5000;

/** True when note/question content fits the visible + raw budgets. */
export const postContentWithinBudget = (content?: string | null): boolean => {
  const raw = content ?? '';
  return (
    visibleTextLength(raw) <= POST_MAX_VISIBLE_LENGTH &&
    raw.length <= POST_MAX_RAW_LENGTH
  );
};
