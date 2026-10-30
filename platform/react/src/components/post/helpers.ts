import type { PublicPost } from '@openpeepshq/common/types';
import { firstNWords as _firstNWords } from '@openpeepshq/common/lib';

/** @deprecated Use `firstNWords` from `@openpeepshq/common/lib` directly. */
export const firstNWords = _firstNWords;

/** Splits a string into user-visible grapheme clusters (so emojis don't get chopped). */
export const stringToSegments = (text: string) =>
  typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter().segment(text)].map((x) => x.segment)
    : Array.from(text);

export const postReactionStats = (post: PublicPost): string => {
  const uniqueEmojis = [
    ...new Set(post.reactions.map((r) => stringToSegments(r.reaction)[0])),
  ].join('');
  return `${uniqueEmojis} ${post.reactions?.length ?? 0}`;
};
