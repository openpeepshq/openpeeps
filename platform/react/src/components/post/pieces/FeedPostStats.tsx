import type { PublicPost } from '@openpeeps/common/types';
import { useT } from '../../../i18n';
import { postReactionStats } from '../helpers';

export interface FeedPostStatsProps {
  post: PublicPost;
}

/**
 * Compact counts row underneath a post. Translates `FullPostStats.svelte`.
 *
 * The Svelte version pops modals for reaction/repost details; we keep this
 * version static for now (no `ReactionsModal`/`RepostModal` ports yet).
 */
export function FeedPostStats({ post }: FeedPostStatsProps) {
  const t = useT();
  const stats = post ? postReactionStats(post) : '';

  return (
    <div className="flex justify-between pb-2 text-xs text-muted-foreground">
      <div>
        {post?.reactions?.length ? <span>{stats}</span> : null}
      </div>
      <div className="flex w-fit items-center gap-1">
        {post?.replyCount ? (
          <span>
            {t('posts.stats.repliesCount', {
              defaultValue: `${post.replyCount} replies`,
              count: post.replyCount,
            })}
          </span>
        ) : null}
        {post?.replyCount && post?.repostCount ? <span>·</span> : null}
        {post?.repostCount ? (
          <span>
            {t('posts.stats.repostsCount', {
              defaultValue: `${post.repostCount} reposts`,
              count: post.repostCount,
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
