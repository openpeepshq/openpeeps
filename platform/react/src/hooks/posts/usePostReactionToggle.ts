import { useContext, useMemo } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import type { PublicPost } from '@openpeepshq/common/types';
import { getPostActionAvailability } from '@openpeepshq/common';
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

  const iReacted = useMemo(
    () => !!post.reactions?.some((r) => r.profile.id === me?.id),
    [post.reactions, me?.id],
  );

  const { canReact } = useMemo(
    () => getPostActionAvailability(authData, post, capabilities),
    [authData, post, capabilities],
  );

  const toggleReaction = async () => {
    if (iReacted) {
      await retractReaction(undefined);
    } else if (canReact) {
      await reactToPost({ reaction: '👍' });
    } else {
      return;
    }
    if (post.visibility === 'direct' && queryClient) {
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  };

  return {
    me,
    iReacted,
    canReact: canReact || iReacted,
    toggleReaction,
  };
};
