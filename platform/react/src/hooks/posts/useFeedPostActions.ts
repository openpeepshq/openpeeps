import { useMemo } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { getPostActionAvailability } from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import {
  useAuthData,
  useCurrentProfile,
} from '../../components/layout/IdentityContext';
import { useCapabilities } from '../../components/server-data';
import { useReplyModal } from '../../components/post/post-form/ReplyModalContext';

/**
 * Non-DOM post footer actions (reply / repost / react) for FeedPost and RN.
 */
export const useFeedPostActions = (post: PublicPost) => {
  const me = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const { openpeepsApi } = useOpenpeeps();
  const { openReply } = useReplyModal();
  const repostsQuery = openpeepsApi.useCurrentProfileReposts();

  const reactToPost = openpeepsApi.reactToPostAction({ id: post.id } as never);
  const retractReaction = openpeepsApi.retractPostReactionAction({
    id: post.id,
  } as never);
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
  const iReacted = useMemo(
    () => !!post.reactions?.some((r) => r.profile.id === me?.id),
    [post.reactions, me?.id],
  );

  const { canReply, canRepost, canReact } = useMemo(
    () => getPostActionAvailability(authData, post, capabilities),
    [authData, post, capabilities],
  );

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

  const toggleReaction = async () => {
    if (iReacted) {
      await retractReaction(undefined);
    } else if (canReact) {
      await reactToPost({ reaction: '👍' });
    }
  };

  return {
    me,
    myRepost,
    iReacted,
    canReply,
    canRepost: canRepost || !!myRepost,
    canReact: canReact || iReacted,
    reply,
    toggleRepost,
    toggleReaction,
  };
};
