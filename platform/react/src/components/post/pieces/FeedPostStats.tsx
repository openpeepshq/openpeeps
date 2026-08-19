import { useState } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { useT } from '../../../i18n';
import { postReactionStats } from '../helpers';
import { ReactionsModal } from './modals/ReactionsModal';
import { RepostModal } from './modals/RepostModal';

export interface FeedPostStatsProps {
  post: PublicPost;
}

export function FeedPostStats({ post }: FeedPostStatsProps) {
  const t = useT();
  const stats = post ? postReactionStats(post) : '';
  const [modal, setModal] = useState<'reactions' | 'reposts' | null>(null);

  const stop = (handler: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handler();
  };

  return (
    <>
      <div className="text-muted-foreground flex justify-between pb-2 text-xs">
        <div>
          {post?.reactions?.length ? (
            <button
              type="button"
              title={t('posts.stats.viewReactions', {
                defaultValue: 'View reactions',
              })}
              className="hover:underline"
              onClick={stop(() => setModal('reactions'))}
            >
              {stats}
            </button>
          ) : null}
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
            <button
              type="button"
              title={t('posts.stats.viewReposts', {
                defaultValue: 'View reposts',
              })}
              className="hover:underline"
              onClick={stop(() => setModal('reposts'))}
            >
              {t('posts.stats.repostsCount', {
                defaultValue: `${post.repostCount} reposts`,
                count: post.repostCount,
              })}
            </button>
          ) : null}
        </div>
      </div>

      <ReactionsModal
        reactions={post.reactions ?? []}
        open={modal === 'reactions'}
        onClose={() => setModal(null)}
      />
      <RepostModal
        reposts={post.reposts ?? []}
        repostCount={post.repostCount ?? 0}
        open={modal === 'reposts'}
        onClose={() => setModal(null)}
      />
    </>
  );
}
