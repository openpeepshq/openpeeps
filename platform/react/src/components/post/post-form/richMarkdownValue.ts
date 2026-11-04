/**
 * Decide which markdown string to keep after an editor change.
 * Returns null when the change should be discarded.
 *
 * The visual editor normalizes markdown as soon as it mounts (list markers,
 * trailing whitespace, and so on). That first pass must not replace the stored
 * document: opening a page and saving would rewrite content nobody edited.
 * A later edit is real, and growth past the character budget is refused while
 * deletes are still allowed so an over-limit document can be shortened.
 */
export const nextRichMarkdownValue = (
  current: string,
  next: string,
  maxLength: number,
  initialNormalize: boolean,
): string | null => {
  if (initialNormalize || next === current) return null;
  if (next.length > maxLength && next.length >= current.length) return null;
  return next;
};
