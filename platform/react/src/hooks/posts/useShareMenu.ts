import type {
  Event,
  Note,
  PostCreationData,
  PublicPost,
} from '@openpeepshq/common/types';
import {
  buildEventIcs,
  isPubliclyShareable,
  truncateMarkdown,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

export type EventIcsFile = { filename: string; content: string };

/**
 * Visible-char cap for the excerpt appended to the post link in a
 * conversation share: link + excerpt must stay inside the conversation
 * post's visible-content budget (500).
 */
const SHARE_EXCERPT_MAX_CHARS = 200;

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
  const createPost = openpeepsApi.createPostAction();

  const eventIcsFile = (): EventIcsFile | null => {
    const ics = buildEventIcs(post, { postUrl });
    if (!ics) return null;
    const event = post.data as Event;
    const raw = event.name?.trim() || `event-${post.id}`;
    const safe = raw.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 100);
    return { filename: `${safe}.ics`, content: ics };
  };

  /** Repost the post to the public feed. */
  const repost = () => repostPost(undefined);

  /**
   * Share a post's link into a group: a new plain note containing the
   * post's public link, posted into the target group. The link is never a
   * repost (no `repostId`), so the source post keeps its own visibility
   * and the group copy stays a lightweight link that anyone in the group
   * can click through.
   */
  const shareIntoGroup = async (groupId: string) => {
    const payload: PostCreationData = {
      visibility: 'group',
      type: 'note',
      groupId,
      data: { type: 'note', content: postUrl },
    };
    await createPost(payload);
  };

  /**
   * Send a post as a direct message: a link note (plus a short excerpt for
   * publicly shareable posts) replied into the given conversation. The
   * server resolves the newest post and inherits the current audience
   * (excluding any leaver), so only a conversation post id is needed here.
   *
   * The link/excerpt is built here, in the shared hook, so web
   * (`SendToConversationPicker`) and native (`SendToConversationModal`) —
   * which both wire `onSend` to this function — share the exact same content
   * and `SHARE_EXCERPT_MAX_CHARS` budget. There is no platform-specific copy.
   */
  const sendToConversation = async (conversation: PublicPost[]) => {
    const root = conversation[0];
    if (!root) return;
    const data: Note = isPubliclyShareable(post)
      ? {
          type: 'note',
          content: `${postUrl}\n${truncateMarkdown(
            (post.data as Note).content,
            1,
            SHARE_EXCERPT_MAX_CHARS,
          )}`.trim(),
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
