import type {
  Event,
  Note,
  PostCreationData,
  PublicPost,
} from '@openpeepshq/common/types';
import {
  buildEventIcs,
  canCreatePost,
  isGroupDiscoverable,
  isPubliclyShareable,
  truncateMarkdown,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import {
  useAuthData,
  useCurrentProfile,
} from '../../components/layout/IdentityContext';

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

/**
 * Whether a post's group is public (non-members can read it). Drives the
 * "Repost to community" label: republishing a public-group post lands in the
 * community feed, while a private-group repost stays in the group.
 */
const isPublicPostGroup = (post: PublicPost): boolean =>
  !!post.group && isGroupDiscoverable(post.group);

/** Share actions for a post; `postUrl` is the platform's canonical public link. */
export const useShareMenu = (post: PublicPost, postUrl: string) => {
  const me = useCurrentProfile();
  const authData = useAuthData();
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

  // "Repost to community" (issue #654): republish a public-group post to the
  // community feed as a plain public note whose only content is the source
  // link. It reuses the ordinary post-creation endpoint (`createPost`) rather
  // than overloading the repost endpoint — the note has no repost
  // relationship, so it never touches the source post's repost state.
  //
  // Record of plan decisions (review 2026-11-25, items 1–2): the link-only
  // content format is intentional — it is the human-approved 2026-11-16
  // decision on the issue ("the link to the group post as its only context"),
  // reaffirmed by the 2026-11-23 instruction to reuse the post-creation
  // endpoint; adding group-handle attribution would contradict it. The
  // gate is likewise intentional: any authenticated user with the
  // instance-level public-note capability (`core-posts-create-note-public`
  // + posts write scope, exactly what the ordinary public-note path in
  // `createPost` enforces) may republish, regardless of source-group
  // membership — confirmed by the issue owner on 2026-11-25 (issue comment
  // 36734: "2. can stay as is"). Membership is deliberately not part of the
  // gate, so no `groupId` is passed and the group capability is not checked.
  const canRepostToCommunity =
    !!me && canCreatePost(authData, 'note', 'public');

  const repostToCommunity = async (): Promise<PublicPost> =>
    createPost({
      visibility: 'public',
      type: 'note',
      // Host-config-dependent: `postUrl` is built from `window.location.origin`
      // (web) or the native `BASE_URL` (native, set from
      // `globals.serverData.rootUrl` at build time). Keep both in sync with
      // the notification pipeline's root URL (`globals.serverData.rootUrl`),
      // or republished notes can contain links that are unresolvable outside
      // the host network (proxies, custom domains, local compose).
      data: { type: 'note', content: postUrl },
    });

  return {
    signedIn: !!me,
    isEvent: post.type === 'event',
    repost,
    shareIntoGroup,
    sendToConversation,
    isPublicPostGroup: isPublicPostGroup(post),
    canRepostToCommunity,
    repostToCommunity: () => repostToCommunity(),
    eventIcsFile,
  };
};
