import type { PublicPost, PublicReplyPost } from '@openpeepshq/common/types';
import { Avatar, ProfileLink } from '../../profile';
import { UpdatingDate } from '@openpeepshq/react-ui';
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
        <ProfileLink profile={profile}>
          <Avatar profile={profile} size={3} />
        </ProfileLink>
        <div className="flex flex-col flex-wrap">
          <ProfileLink
            profile={profile}
            className="text-sm font-semibold hover:underline"
          >
            {profile.displayName || `@${profile.handle}`}
          </ProfileLink>
          <span className="text-muted-foreground text-xs">
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
