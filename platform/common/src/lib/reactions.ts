export const AP_LIKE_REACTION = '👍';

/**
 * Whether a logged reaction value is usable: a non-empty emoji string.
 * The community may configure a custom allowed set, so this no longer
 * restricts to the curated defaults — it only guards against malformed/empty
 * entries so response validation cannot fail on legacy logs. Reactions that
 * were attached before being removed from the configured set still pass.
 */
export const isReactionType = (reaction: string): boolean =>
  typeof reaction === 'string' && reaction.trim().length > 0;

export type ReactionLogEntry = {
  type: string;
  createdAt: string;
  data?: unknown;
  profile: { id: string };
};

const reactionFromData = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object' || !('reaction' in data)) {
    return undefined;
  }
  const reaction = data.reaction;
  return typeof reaction === 'string' && reaction.length > 0
    ? reaction
    : undefined;
};

/** Latest reaction/unreaction per (profile, emoji) wins. */
export const currentReactionsFromEntries = <T extends ReactionLogEntry>(
  entries: readonly T[],
): Array<{ reaction: string; profile: T['profile'] }> => {
  const latest = new Map<string, { entry: T; reaction: string }>();
  const sorted = [...entries].filter(
    (entry) => entry.type === 'reaction' || entry.type === 'unreaction',
  );
  sorted.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  for (const entry of sorted) {
    const reaction = reactionFromData(entry.data);
    if (!reaction) continue;
    latest.set(`${entry.profile.id}\0${reaction}`, { entry, reaction });
  }
  return [...latest.values()]
    .filter(({ entry }) => entry.type === 'reaction')
    .map(({ entry, reaction }) => ({
      reaction,
      profile: entry.profile,
    }));
};

export const isReactionHistoryEntry = (type: string) =>
  type === 'reaction' || type === 'unreaction';
