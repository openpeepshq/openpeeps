import type { PublicPost } from '@openpeepshq/common/types';
import { usePostReactions } from './usePostReactions';

/**
 * Reaction toggle for a single post, used by the DM message bubble.
 *
 * The DM bubble keeps a single button: tapping it adds the default 👍, or
 * retracts the profile's own most recent reaction (the decision from issue
 * #80, so a non-👍 reaction can never be stuck in a DM). The feed footer uses
 * `useFeedPostActions` to expose the curated reaction set instead. Both share
 * `usePostReactions` for the toggle contract.
 */
export const usePostReactionToggle = (post: PublicPost) => {
  const { myReactions, iReacted, canReactRaw, toggleReaction } =
    usePostReactions(post);

  return {
    iReacted,
    myReactions,
    // Trigger state: stays open once the profile has reacted, even after the
    // react capability lapses, so an existing reaction can still be cleared.
    canReact: canReactRaw || iReacted,
    toggleReaction,
  };
};
