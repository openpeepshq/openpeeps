import { useMemo } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useReplyModal } from '../../components/post/post-form/ReplyModalContext';

/**
 * Non-DOM post footer actions (reply / repost / react) for FeedPost and RN.
 */
export const useFeedPostActions = (post: PublicPost) => {
  const me = useCurrentProfile();
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

  const isGroupPost = !!post.groupId;
  const membershipExists = !!me?.memberships?.some(
    (m) => m.group.id === post.group?.id,
  );
  const disabledForGroup = isGroupPost && !membershipExists;

  const reply = () => openReply(post);

  const toggleRepost = async () => {
    if (myRepost) {
      await deletePost({ id: myRepost.id } as never);
    } else {
      await repostPost(undefined);
    }
    await repostsQuery.refetch();
  };

  const toggleReaction = async () => {
    if (iReacted) {
      await retractReaction(undefined);
    } else {
      await reactToPost({ reaction: '👍' });
    }
  };

  return {
    me,
    myRepost,
    iReacted,
    disabledForGroup,
    reply,
    toggleRepost,
    toggleReaction,
  };
};
