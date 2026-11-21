import type { Event, Note, PublicPost } from '@openpeepshq/common/types';
import { buildEventIcs, isPubliclyShareable } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

export type EventIcsFile = { filename: string; content: string };

/** Canonical public path for a post, including a recurring event occurrence. */
export const postPublicPath = (
  post: Pick<PublicPost, 'id' | 'occurrenceRecurrenceId'>,
) => {
  const occurrence = post.occurrenceRecurrenceId;
  if (!occurrence) return `/posts/${post.id}`;
  return `/posts/${post.id}?occurrence=${encodeURIComponent(occurrence)}`;
};

/** Share actions for a post; `postUrl` is the platform's canonical public link. */
export const useShareMenu = (post: PublicPost, postUrl: string) => {
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const repostPost = openpeepsApi.repostPostAction({ id: post.id });

  const eventIcsFile = (): EventIcsFile | null => {
    const ics = buildEventIcs(post, { postUrl });
    if (!ics) return null;
    const event = post.data as Event;
    const raw = event.name?.trim() || `event-${post.id}`;
    const safe = raw.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 100);
    return { filename: `${safe}.ics`, content: ics };
  };

  /** Repost to the public feed, or into `groupId` when one is passed. */
  const repost = (groupId?: string) => repostPost({ groupId });

  /**
   * Share a post into a group: a lightweight repost duplicate (provenance
   * `repostId` set, visibility forced `group` server-side). The group copy
   * carries no content — the source post stays authoritative.
   */
  const shareIntoGroup = async (groupId: string) => {
    await repost(groupId);
  };

  /**
   * Send a post as a direct message: a link note (plus an excerpt for
   * publicly shareable posts) replied into the given conversation. The
   * server resolves the newest post and inherits the current audience
   * (excluding any leaver), so only a conversation post id is needed here.
   */
  const sendToConversation = async (conversation: PublicPost[]) => {
    const root = conversation[0];
    if (!root) return;
    const data: Note = isPubliclyShareable(post)
      ? {
          type: 'note',
          content: `${postUrl}\n${(post.data as Note).content ?? ''}`.trim(),
        }
      : { type: 'note', content: postUrl };
    await openpeepsApi.createConversationPostAction({ id: root.id })({
      visibility: 'direct',
      type: 'note',
      data,
    });
  };

  return {
    signedIn: !!me,
    isEvent: post.type === 'event',
    repost,
    shareIntoGroup,
    sendToConversation,
    eventIcsFile,
  };
};
