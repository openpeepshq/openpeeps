import type { Event, PublicPost } from '@openpeepshq/common/types';
import {
  buildEventIcs,
  canCreatePost,
  getPostActionAvailability,
  isPublicGroup,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import {
  useAuthData,
  useCurrentProfile,
} from '../../components/layout/IdentityContext';
import { useCapabilities } from '../../components/server-data';

export type EventIcsFile = { filename: string; content: string };

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
 *
 * Local predicate — deliberately not part of the hook's public surface
 * (review round 7, S7): both menus read it through the hook's
 * `isPublicPostGroup` field.
 */
const isPublicPostGroup = (post: PublicPost): boolean =>
  !!post.group && isPublicGroup(post.group);

/** Share actions for a post; `postUrl` is the platform's canonical public link. */
export const useShareMenu = (post: PublicPost, postUrl: string) => {
  const me = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
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

  // Mirrors both gates of the repost endpoint's republish path (issue #654):
  // (a) the type-scoped group capability on the source group
  // (`core-posts-create-${post.type}` — the same `canRepost` predicate the
  // feed footer and the endpoint's group gate use), plus (b) the public-note
  // write path (`core-posts-create-note-public` role capability + posts write
  // scope), because the republished note lands in the community feed.
  // "Repost to community" is only offered when the caller passes both —
  // otherwise the menu would hand out an action the endpoint answers with 403.
  const canRepost = getPostActionAvailability(
    authData,
    post,
    capabilities,
  ).canRepost;
  const canRepostToCommunity =
    !!me && canRepost && canCreatePost(authData, 'note', 'public');

  return {
    signedIn: !!me,
    isEvent: post.type === 'event',
    isPublicPostGroup: isPublicPostGroup(post),
    canRepostToCommunity,
    repost: () => repostPost(undefined),
    eventIcsFile,
  };
};
