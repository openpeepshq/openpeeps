import type { PublicPost } from '@openpeepshq/common/types';
import { Avatar, AvatarWithName, ProfileLink } from '../../profile';
import { useT } from '../../../i18n';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { PostMenu } from './PostMenu';

export interface PostReactionHeaderProps {
  post: PublicPost;
  inGroup?: boolean;
  deleteCallback?: () => void;
}

/**
 * Small banner above feed posts that explains why this post is in the feed
 * (reposted, reply, posted in group X). Translates
 * `PostReactionHeader.svelte`.
 */
export function PostReactionHeader({
  post,
  inGroup = false,
  deleteCallback,
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

  const menuPost = (post.repost as PublicPost | undefined) ?? post;

  return (
    <div className="border-border flex items-center justify-between gap-2 border-b py-2 text-sm">
      <div className="flex w-5/6 flex-1 items-center gap-2">
        {showGroup ? (
          <>
            {isRepost ? (
              <>
                <ProfileLink profile={post.profile}>
                  <Avatar profile={post.profile} size={2.25} />
                </ProfileLink>
                <span className="font-light">
                  {t('posts.reposted', { defaultValue: 'reposted' })}
                </span>
              </>
            ) : isReply && replyPost?.profile ? (
              <>
                <ProfileLink profile={post.profile}>
                  <AvatarWithName profile={post.profile} />
                </ProfileLink>
                <a className="w-max" href={`/posts/${post.inReplyToId}`}>
                  {t('posts.replyTo', { defaultValue: 'replied to' })}
                </a>
                <ProfileLink className="w-max" profile={replyPost.profile}>
                  <AvatarWithName profile={replyPost.profile} />
                </ProfileLink>
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
            <ProfileLink profile={post.profile}>
              <AvatarWithName profile={post.profile} />
            </ProfileLink>
            <span className="font-light">
              {t('posts.reposted', { defaultValue: 'reposted' })}
            </span>
          </>
        ) : isReply && replyPost?.profile ? (
          <>
            <ProfileLink profile={post.profile}>
              <AvatarWithName profile={post.profile} />
            </ProfileLink>
            <a href={`/posts/${post.inReplyToId}`} className="text-sm">
              {t('posts.replyTo', { defaultValue: 'replied to' })}
            </a>
            <ProfileLink profile={replyPost.profile}>
              <AvatarWithName profile={replyPost.profile} />
            </ProfileLink>
          </>
        ) : null}
      </div>
      <PostMenu post={menuPost} deleteCallback={deleteCallback} />
    </div>
  );
}
