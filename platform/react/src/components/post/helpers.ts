import type { PublicPost } from '@openpeeps/common/types';

/** Splits a string into user-visible grapheme clusters (so emojis don't get chopped). */
export const stringToSegments = (text: string) =>
  [...new Intl.Segmenter().segment(text)].map((x) => x.segment);

export const postReactionStats = (post: PublicPost): string => {
  const uniqueEmojis = [
    ...new Set(
      post.reactions.map((r) => stringToSegments(r.reaction)[0]),
    ),
  ].join('');
  return `${uniqueEmojis} ${post.reactions?.length ?? 0}`;
};

/** Truncates markdown to roughly the first N words, preserving links. */
export const firstNWords = (markdown: string | undefined, n: number): string => {
  if (!markdown) return '';
  const regex = /\[.*?\]\(.*?\)|(\w+)/g;
  let wordCount = 0;
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    if (wordCount >= n) break;
    out.push(match[0]);
    wordCount++;
  }
  return out.join(' ');
};
