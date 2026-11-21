import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PublicPost, ReactionData } from '@openpeepshq/common/types';
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
 * Shared reaction state + toggle for a single post, owned by both the DM
 * bubble (`usePostReactionToggle`) and the feed footer (`useFeedPostActions`)
 * so the retract/react contract lives in one place.
 *
 * `myReactions` lists the emojis the current profile attached, in the order
 * the server returns them (chronological), so the last entry is the profile's
 * most recent reaction.
 *
 * `toggleReaction(reaction)`:
 * - with a reaction (feed footer): retract it if the profile already has it,
 *   otherwise add it (adding requires the react capability);
 * - with no argument (DM bubble): retract the profile's own latest reaction
 *   if it has any, otherwise add the default 👍 (requires the capability).
 *
 * Retracting never requires the capability — a profile that reacted but later
 * lost `core-posts-react` must still be able to clear its own reaction.
 *
 * `conversations` queries are only invalidated for direct posts so a reaction
 * on a feed post does not refetch every open thread.
 */
export const usePostReactions = (post: PublicPost) => {
  const me = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const queryClient = useQueryClient();
  const { openpeepsApi } = useOpenpeeps();

  const reactToPost = openpeepsApi.reactToPostAction({ id: post.id } as never);
  const retractReaction = openpeepsApi.retractPostReactionAction({
    id: post.id,
  } as never);

  const myReactions = useMemo(
    () =>
      post.reactions
        ?.filter((r) => r.profile.id === me?.id)
        .map((r) => r.reaction) ?? [],
    [post.reactions, me?.id],
  );
  const iReacted = myReactions.length > 0;
  // Server orders reactions chronologically, so the last one is the profile's
  // most recent reaction — what the DM bubble clears.
  const myLatestReaction = myReactions.length
    ? myReactions[myReactions.length - 1]
    : undefined;

  const { canReact: canReactRaw } = useMemo(
    () => getPostActionAvailability(authData, post, capabilities),
    [authData, post, capabilities],
  );

  const toggleReaction = async (reaction?: ReactionData['reaction']) => {
    // `AP_LIKE_REACTION` is the single source for the legacy plain like the
    // server retracts on a bodyless DELETE.
    const target = reaction ?? myLatestReaction ?? AP_LIKE_REACTION;
    if (myReactions.includes(target)) {
      // DELETE carries no body; the reaction travels as `?reaction=`.
      await retractReaction(undefined, { reaction: target }, undefined);
    } else if (canReactRaw) {
      await reactToPost({ reaction: target });
    } else {
      return;
    }
    if (post.visibility === 'direct') {
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  };

  return {
    myReactions,
    iReacted,
    canReactRaw,
    toggleReaction,
  };
};
