import type { PublicPost } from '@openpeepshq/common/types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Name a single conversation's participants (excluding `meId`), joining the
 * last post's audience with ', '.
 *
 * The last post's audience is the current view of the thread; a leave post
 * or a note-to-self follow-up can leave it with no other members, so callers
 * that name a whole thread (not just the last message) pass
 * `fallbackToRoot` to fall back to the root post's participants.
 */
export const conversationParticipantNames = (
  conversation: PublicPost[],
  meId: string | null | undefined,
  fallbackToRoot = false,
) => {
  const last = conversation.at(-1);
  if (!last) return '';
  const namesFrom = (post: PublicPost) =>
    (post.audience ?? [])
      .filter((p) => p.id !== meId)
      .map((p) => p.displayName || `@${p.handle}`)
      .join(', ');
  if (namesFrom(last)) return namesFrom(last);
  if (fallbackToRoot) {
    const root = conversation[0];
    if (root && root !== last) return namesFrom(root);
  }
  return '';
};

/**
 * Human title for a conversation: the other participants' names, or "You"
 * when the viewer is the only named member.
 *
 * `withYou` renders the inbox form ("{{names}} and You"); without it the
 * title is names-only (the share-picker form). Callers may truncate the
 * result.
 */
export const conversationTitle = (
  conversation: PublicPost[],
  t: Translate,
  meId: string | null | undefined,
  {
    fallbackToRoot = false,
    withYou = false,
  }: {
    fallbackToRoot?: boolean;
    withYou?: boolean;
  } = {},
) => {
  const names = conversationParticipantNames(
    conversation,
    meId,
    fallbackToRoot,
  );
  if (!names) return t('common.you', { defaultValue: 'You' });
  return withYou
    ? t('conversations.titleWithYou', {
        defaultValue: '{{names}} and You',
        names,
      })
    : names;
};
