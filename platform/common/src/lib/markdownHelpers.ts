import { mentionHandleRegexBase } from '../types';

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type MentionProfileRef = {
  profile: { handle?: string | null; displayName?: string | null };
};

const mentionPrefix = '(^|[\\s(>])';
const mentionSuffix = '(?=\\s|$|[.,!?;:])';

/**
 * Turn `@handle` / known `@displayName` into markdown profile links.
 * Display names are matched exactly (longest first) so apostrophes and other
 * non-letter characters still count when that profile is in `mentions`.
 * Bare `@handle` tokens use the allowed handle charset (letters, digits, `_`, `-`).
 */
export const linkProfileMentions = (
  source: string,
  mentions: MentionProfileRef[] = [],
): string => {
  const aliases = mentions.flatMap(({ profile }) => {
    const handle = profile.handle?.trim();
    if (!handle) return [];
    const names = new Set<string>([handle]);
    const displayName = profile.displayName?.trim();
    if (displayName) names.add(displayName);
    return [...names].map((name) => ({ name, handle }));
  });

  aliases.sort((a, b) => b.name.length - a.name.length);

  let text = source;
  for (const { name, handle } of aliases) {
    const pattern = new RegExp(
      `${mentionPrefix}@(${escapeRegExp(name)})${mentionSuffix}`,
      'gi',
    );
    text = text.replace(
      pattern,
      (_full, prefix: string, mentioned: string) =>
        `${prefix}[@${mentioned}](/@${handle})`,
    );
  }

  return text.replace(
    new RegExp(mentionHandleRegexBase, 'g'),
    (_full, prefix: string, handle: string) =>
      `${prefix}[@${handle}](/@${handle})`,
  );
};

export const matchMentionHandles = (text?: string | null): string[] => {
  if (!text) return [];
  const handles = new Set<string>();
  for (const match of text.matchAll(new RegExp(mentionHandleRegexBase, 'g'))) {
    const handle = match[2];
    if (handle) handles.add(handle);
  }
  return [...handles];
};

export const firstNWords = (markdown: string | undefined, n: number) => {
    if (!markdown) return '';
    // Regular expression to match words and markdown links.
    const regex = /\[.*?\]\(.*?\)|(\w+)/g;

    let wordCount = 0;
    const firstTwelveWords = [];
    let match;

    while ((match = regex.exec(markdown)) !== null) {
        // Check if the match is a link or a regular word.
        if (match[1]) { // It's a regular word
            firstTwelveWords.push(match[1]);
            wordCount++;
        } else { // It's a markdown link - treat it as one word
            firstTwelveWords.push(match[0]);  // Add the entire link string
            wordCount++;
        }

        if (wordCount >= n) {
            break;
        }
    }

    return firstTwelveWords.join(" ");
}
