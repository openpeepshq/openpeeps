import type { PublicPost, PublicReplyPost } from '@openpeeps/common/types';
import { Avatar } from '../../profile';
import { UpdatingDate } from './UpdatingDate';

export interface PostInfoHeaderProps {
  post: PublicPost | PublicReplyPost;
  showMenu?: boolean;
  /** Invoked by the menu when the post is deleted. */
  deleteCallback?: () => void;
}

/**
 * Avatar + display-name + handle + relative date for a single post.
 *
 * NOTE: the SvelteKit version includes a `PostMenu` (3-dot menu) when
 * `showMenu` is true. We omit it here pending a React port of `PostMenu`
 * (delete, mute, report, copy link, …).
 */
export function PostInfoHeader({ post }: PostInfoHeaderProps) {
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
    </div>
  );
}
