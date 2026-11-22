import { useContext, useMemo } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  AP_LIKE_REACTION,
  getPostActionAvailability,
} from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import {
  useAuthData,
  useCurrentProfile,
} from '../../components/layout/IdentityContext';
import { useCapabilities } from '../../components/server-data';

/**
 * Reaction toggle for a single post, shared by the feed footer (via
 * useFeedPostActions) and DM message bubbles.
 *
 * `conversations` queries are only invalidated for direct posts so a
 * reaction on a feed post does not refetch every open thread.
 */
export const usePostReactionToggle = (post: PublicPost) => {
  const me = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const queryClient = useContext(QueryClientContext);
  const { openpeepsApi } = useOpenpeeps();

  const reactToPost = openpeepsApi.reactToPostAction({ id: post.id } as never);
  const retractReaction = openpeepsApi.retractPostReactionAction({
    id: post.id,
  } as never);

  const { canReact } = useMemo(
    () => getPostActionAvailability(authData, post, capabilities),
    [authData, post, capabilities],
  );

  const myReactionEmojis = useMemo(
    () =>
      post.reactions
        ?.filter((r) => r.profile.id === me?.id)
        .map((r) => r.reaction) ?? [],
    [post.reactions, me?.id],
  );

  /** The profile attached the default 👍 — drives the thumbs-up button's
   * highlight. A post the profile only ❤️'d (or otherwise reacted to) is not
   * "liked", so the 👍 control stays unhighlighted for those. */
  const iLiked = useMemo(
    () => myReactionEmojis.includes(AP_LIKE_REACTION),
    [myReactionEmojis],
  );

  /**
   * The profile attached any reaction to this post. Kept separate from
   * `iLiked` because an attached reaction stays usable even after the
   * community's allowed set removes it (orphaned reactions remain visible and
   * retractable), so "can still interact" is based on any attached reaction,
   * not just 👍.
   */
  const hasAttachedReaction = myReactionEmojis.length > 0;

  /**
   * Toggle a reaction. With `reaction` (the picker) this toggles exactly that
   * emoji. Without it it toggles the legacy like (👍), so it can never
   * accidentally remove a different emoji.
   *
   * A failed op is swallowed, not rejected: the call sites fire the promise
   * as `void toggleReaction(…)`, and a mid-session change to the community's
   * allowed set (e.g. `error.reactionNotAllowed`) or a concurrent retract is
   * benign — no local state changed, so the post's reaction rows (including
   * the orphan row) self-heal on the next refetch.
   */
  const toggleReaction = async (reaction?: string) => {
    const emoji = reaction ?? AP_LIKE_REACTION;
    const already = myReactionEmojis.includes(emoji);
    if (already) {
      // DELETE carries no body; the reaction travels as `?reaction=`.
      await retractReaction(undefined, { reaction: emoji }).catch(() => {});
    } else if (canReact) {
      await reactToPost({ reaction: emoji }).catch(() => {});
    } else {
      return;
    }
    if (post.visibility === 'direct' && queryClient) {
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  };

  /** "Can react" widened to "can interact": a profile that already attached a
   * (possibly orphaned) reaction must still be able to retract it, even when
   * it could no longer add new reactions. */
  const canInteract = canReact || hasAttachedReaction;

  return {
    me,
    iLiked,
    myReactions: myReactionEmojis,
    canReact: canInteract,
    toggleReaction,
  };
};
