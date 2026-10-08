import type { PublicPost } from '@openpeepshq/common/types';
import { isUnreadFeedActivityForViewer } from '../../lib/postUnread';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

export type FeedPostPresentationOptions = {
  noReactionHeader?: boolean;
  inGroup?: boolean;
  showReplyTo?: boolean;
};

export const feedPostPresentation = (
  post: PublicPost,
  viewerId: string | undefined,
  options: FeedPostPresentationOptions = {},
) => {
  const displayedPost: PublicPost = post.repost ?? post;
  const isUnread = isUnreadFeedActivityForViewer(post, viewerId);
  const hasReactionHeader =
    !options.noReactionHeader &&
    (!!post.repost ||
      !!post.inReplyToId ||
      (!!post.groupId && !options.inGroup));
  const showsReplyTo = !!(options.showReplyTo && displayedPost.replyTo);
  const showThreadPreview =
    !options.noReactionHeader &&
    !showsReplyTo &&
    !displayedPost.inReplyToId &&
    ((displayedPost.latestReplies?.length ?? 0) > 0 ||
      displayedPost.latestRepliesHasMore ||
      (displayedPost.replyCount ?? 0) > 0);
  const hasStats = !!(
    displayedPost.repostCount ||
    displayedPost.reactions?.length ||
    displayedPost.replyCount
  );

  return {
    displayedPost,
    isUnread,
    hasReactionHeader,
    showsReplyTo,
    showThreadPreview,
    hasStats,
    viewContext: {
      groupId: post.groupId,
      adjustUnread: isUnread,
    },
  };
};

export const useFeedPostPresentation = (
  post: PublicPost,
  options?: FeedPostPresentationOptions,
) => {
  const me = useCurrentProfile();
  return {
    me,
    ...feedPostPresentation(post, me?.id, options),
  };
};
