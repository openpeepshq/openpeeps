import type { PublicPost } from '@openpeeps/common/types';
import { Avatar } from '../../../profile';
import { usePostViewRef } from '../../../../lib/postViewCounter';
import { FeedPostContent } from '../../FeedPostContent';
import { PostActions } from '../../pieces/PostActions';
import { PostMenu } from '../../pieces/PostMenu';
import { UpdatingDate } from '../../pieces/UpdatingDate';

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
  const postViewRef = usePostViewRef(post.id);

  return (
    <div ref={postViewRef} className="flex flex-row gap-2 p-2">
      <div className="relative w-12 shrink-0">
        <a href={`/@${post.profile.handle}`}>
          <Avatar profile={post.profile} size={3} />
        </a>
        {isParent ? (
          <div className="bg-surface-300 absolute left-6 top-12 h-[calc(100%-2rem)] w-px" />
        ) : null}
        {isChild ? (
          <div className="bg-surface-300 absolute left-6 top-0 h-8 w-px" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="bg-surface-100 rounded-xl p-2">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <a
                href={`/@${post.profile.handle}`}
                className="text-sm font-semibold hover:underline"
              >
                {post.profile.displayName || `@${post.profile.handle}`}
              </a>
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
