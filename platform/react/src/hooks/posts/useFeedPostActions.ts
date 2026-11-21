import { useMemo } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { getPostActionAvailability } from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import {
  useAuthData,
  useCurrentProfile,
} from '../../components/layout/IdentityContext';
import { useCapabilities } from '../../components/server-data';
import { useReplyOpener } from './replyOpener';
import { usePostReactions } from './usePostReactions';

/**
 * Non-DOM post footer actions (reply / repost / react) for FeedPost and RN.
 *
 * Reactions differ from usePostReactionToggle (DM bubble single button): the
 * footer exposes the curated reaction set — `myReactions` lists the emojis
 * the current profile attached, and `toggleReaction(reaction)` retracts that
 * specific emoji via `?reaction=…` or adds it.
 *
 * The exposed `canReact` is the trigger's active state, not the raw capability:
 * it stays `true` when the profile already reacted but lost the
 * `core-posts-react` capability (left the group, capability revoked), so an
 * existing reaction can still be retracted from the footer. Adding a new
 * reaction still requires the raw capability — see `toggleReaction` in
 * `usePostReactions`.
 */
export const useFeedPostActions = (post: PublicPost) => {
  const me = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const { openpeepsApi } = useOpenpeeps();
  const openReply = useReplyOpener();
  const repostsQuery = openpeepsApi.useCurrentProfileReposts();
  const reactions = usePostReactions(post);

  const repostPost = openpeepsApi.repostPostAction({ id: post.id } as never);
  const deletePost = openpeepsApi.deletePostAction({ id: post.id } as never);

  const myRepost = useMemo(
    () =>
      (
        repostsQuery.data as
          | { id: string; repost?: { id: string } }[]
          | undefined
      )?.find((p) => p.repost?.id === post.id),
    [repostsQuery.data, post.id],
  );

  const { canReply, canRepost: canRepostRaw } = useMemo(
    () => getPostActionAvailability(authData, post, capabilities),
    [authData, post, capabilities],
  );
  // Un-react-capable trigger state (mirrors usePostReactionToggle): a profile
  // that already reacted keeps an open picker even after the capability lapses,
  // so an existing reaction is never stuck from the footer.
  const canRepost = canRepostRaw || !!myRepost;
  const canReact = reactions.canReactRaw || reactions.iReacted;

  const reply = () => {
    if (!canReply) return;
    openReply(post);
  };

  const toggleRepost = async () => {
    if (myRepost) {
      await deletePost({ id: myRepost.id } as never);
    } else if (canRepost) {
      await repostPost(undefined);
    } else {
      return;
    }
    await repostsQuery.refetch();
  };

  return {
    me,
    myRepost,
    iReacted: reactions.iReacted,
    myReactions: reactions.myReactions,
    canReply,
    canRepost,
    canReact,
    reply,
    toggleRepost,
    toggleReaction: reactions.toggleReaction,
  };
};
