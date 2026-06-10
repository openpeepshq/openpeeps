import type { PublicPost } from '@openpeeps/common/types';
import { Avatar, AvatarWithName } from '../../profile';
import { useT } from '../../../i18n';
import { useOpenpeeps } from '../../../contexts/openpeeps';

export interface PostReactionHeaderProps {
  post: PublicPost;
  inGroup?: boolean;
}

/**
 * Small banner above feed posts that explains why this post is in the feed
 * (reposted, reply, posted in group X). Translates
 * `PostReactionHeader.svelte`.
 */
export function PostReactionHeader({
  post,
  inGroup = false,
}: PostReactionHeaderProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();

  const replyPostQuery = post.inReplyToId
    ? openpeepsApi.usePost?.(post.inReplyToId)
    : undefined;
  const replyPost = replyPostQuery?.data;

  const showGroup = !!(post.groupId && post.group && !inGroup);
  const isRepost = !!post.repost;
  const isReply = !!post.inReplyToId && !!replyPost?.profile?.handle;

  // In the feed the reply parent is fetched lazily via `usePost`, so until it
  // resolves (or if it cannot be loaded) none of the branches below have data
  // to render. Without this guard we'd still emit the bordered banner wrapper,
  // leaving an empty bar above reply posts that looks broken. Render nothing
  // until there is actual reply/repost/group context to show.
  if (!showGroup && !isRepost && !isReply) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-b py-2 text-sm">
      <div className="flex flex-1 items-center gap-2">
        {showGroup ? (
          <>
            {isRepost ? (
              <>
                <a href={`/@${post.profile.handle}`}>
                  <Avatar profile={post.profile} size={2.25} />
                </a>
                <span className="font-light">
                  {t('posts.reposted', { defaultValue: 'reposted' })}
                </span>
              </>
            ) : isReply && replyPost?.profile ? (
              <>
                <a href={`/@${post.profile.handle}`}>
                  <AvatarWithName profile={post.profile} />
                </a>
                <a className="w-max" href={`/posts/${post.inReplyToId}`}>
                  {t('posts.replyTo', { defaultValue: 'replied to' })}
                </a>
                <a className="w-max" href={`/@${replyPost.profile.handle}`}>
                  <AvatarWithName profile={replyPost.profile} />
                </a>
                <span className="font-light">in</span>
              </>
            ) : (
              <span className="font-light">Posted in</span>
            )}
            <a
              href={`/groups/@${post.group?.handle}`}
              className="text-primary flex-1 truncate font-semibold"
            >
              {post.group?.displayName}
            </a>
          </>
        ) : isRepost ? (
          <>
            <a href={`/@${post.profile.handle}`}>
              <AvatarWithName profile={post.profile} />
            </a>
            <span className="font-light">
              {t('posts.reposted', { defaultValue: 'reposted' })}
            </span>
          </>
        ) : isReply && replyPost?.profile ? (
          <>
            <a href={`/@${post.profile.handle}`}>
              <AvatarWithName profile={post.profile} />
            </a>
            <a href={`/posts/${post.inReplyToId}`} className="text-sm">
              {t('posts.replyTo', { defaultValue: 'replied to' })}
            </a>
            <a href={`/@${replyPost.profile.handle}`}>
              <AvatarWithName profile={replyPost.profile} />
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}
