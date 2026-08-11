import type { PublicPost } from '@openpeepshq/common/types';
import { Avatar, ProfileLink } from '../../../profile';
import { usePostViewRef } from '../../../../lib/postViewCounter';
import { isUnreadPostForViewer } from '../../../../lib/postUnread';
import { useCurrentProfile } from '../../../layout/IdentityContext';
import { FeedPostContent } from '../../FeedPostContent';
import { PostActions } from '../../pieces/PostActions';
import { PostMenu } from '../../pieces/PostMenu';
import { UnreadPostIndicator } from '../../pieces/UnreadPostIndicator';
import { UpdatingDate } from '@openpeepshq/react-ui';

export interface ThreadPostProps {
  post: PublicPost;
  isParent?: boolean;
  isChild?: boolean;
  noActions?: boolean;
  noMenu?: boolean;
}

export function ThreadPost({
  post,
  isParent = false,
  isChild = false,
  noActions = false,
  noMenu = false,
}: ThreadPostProps) {
  const me = useCurrentProfile();
  const isUnread = isUnreadPostForViewer(post, me?.id);
  const postViewRef = usePostViewRef(post.id, {
    groupId: post.groupId,
    adjustUnread: isUnread,
  });

  return (
    <div ref={postViewRef} className="relative flex flex-row gap-2 p-2">
      <UnreadPostIndicator show={isUnread} className="left-0.5 top-5" />
      <div className="relative w-12 shrink-0">
        <ProfileLink profile={post.profile}>
          <Avatar profile={post.profile} size={3} />
        </ProfileLink>
        {/* Connectors run in the row's `p-2` gutter so they meet the next / previous
            avatar's edge instead of crossing the avatar itself. */}
        {isParent ? (
          <div className="bg-border-2 absolute left-6 top-12 h-[calc(100%-2.5rem)] w-px" />
        ) : null}
        {isChild ? (
          <div className="bg-border-2 absolute -top-2 left-6 h-2 w-px" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="bg-surface rounded-xl p-2">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <ProfileLink
                profile={post.profile}
                className="text-sm font-semibold hover:underline"
              >
                {post.profile.displayName || `@${post.profile.handle}`}
              </ProfileLink>
              <span className="text-muted-foreground ml-2 text-xs">
                @{post.profile.handle}
              </span>
            </div>
            <div className="flex shrink-0 items-start gap-2">
              <span className="text-sm font-extralight">
                <UpdatingDate date={post.createdAt} />
              </span>
              {!noMenu ? <PostMenu post={post} /> : null}
            </div>
          </div>
          <FeedPostContent post={post} />
        </div>
        {!noActions ? <PostActions post={post} compact /> : null}
      </div>
    </div>
  );
}
