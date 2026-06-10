import type { PublicPost, PublicReplyPost } from '@openpeeps/common/types';
import { Avatar } from '../../profile';
import { UpdatingDate } from './UpdatingDate';
import { PostMenu } from './PostMenu';

export interface PostInfoHeaderProps {
  post: PublicPost | PublicReplyPost;
  showMenu?: boolean;
  deleteCallback?: () => void;
}

export function PostInfoHeader({
  post,
  showMenu = false,
  deleteCallback,
}: PostInfoHeaderProps) {
  const { profile } = post;
  return (
    <div className="flex justify-between py-2">
      <div className="flex w-fit space-x-2">
        <a href={`/@${profile.handle}`}>
          <Avatar profile={profile} size={3} />
        </a>
        <div className="flex flex-col flex-wrap">
          <a
            href={`/@${profile.handle}`}
            className="text-sm font-semibold hover:underline"
          >
            {profile.displayName || `@${profile.handle}`}
          </a>
          <span className="text-xs text-muted-foreground">
            @{profile.handle}
          </span>
          <span className="text-xs font-extralight">
            <UpdatingDate date={post.createdAt} />
          </span>
        </div>
      </div>
      {showMenu && 'id' in post ? (
        <PostMenu post={post as PublicPost} deleteCallback={deleteCallback} />
      ) : null}
    </div>
  );
}
