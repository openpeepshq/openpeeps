import { useRef, useEffect } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { usePostThreads } from '../../hooks/posts/usePostThreads';
import { useT } from '../../i18n';
import { FeedPost } from './FeedPost';
import { ThreadedFeed } from './feed/threaded/ThreadedFeed';
import { ReplyBox } from './ReplyBox';

/**
 * Shifts the compact thread rail (`p-2` + half a 3rem avatar = 2rem) onto the
 * main post card's rail (`p-4` + half a 3rem avatar = 2.5rem).
 */
const threadIndent = 'pl-2';

export interface FullPostLayoutProps {
  post: PublicPost;
  deleteCallback?: () => void;
  children?: React.ReactNode;
}

export function FullPostLayout({
  post,
  deleteCallback,
  children,
}: FullPostLayoutProps) {
  const t = useT();
  const { ancestryThread, descendentThreads, isLoading } = usePostThreads(
    post.id,
  );
  const postRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    postRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [post.id]);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <>
      {ancestryThread ? (
        <div className={threadIndent}>
          <ThreadedFeed thread={ancestryThread} isAncestors />
        </div>
      ) : null}
      <div ref={postRef} className="relative">
        {children ?? (
          <FeedPost
            post={post}
            deleteCallback={deleteCallback}
            // The page header already names the group. On a repost, keep the
            // banner so it says who shared it instead of hiding that.
            inGroup={!!post.group}
            noReactionHeader={!post.repost}
          />
        )}
        {/* Continues the ancestors' thread line across the card padding down to
            the main post's avatar (p-4 + header py-2 = 1.5rem, centered at 2.5rem).
            Painted after the card so it sits on top without a z-index, which would
            also lift it above the sticky page header. */}
        {ancestryThread ? (
          <div className="bg-border-2 pointer-events-none absolute left-10 top-0 h-6 w-px" />
        ) : null}
      </div>
      <ReplyBox post={post} />
      {descendentThreads.map((thread) => (
        <div key={thread.id} className={threadIndent}>
          <ThreadedFeed thread={thread} />
        </div>
      ))}
      <div className="h-[70vh]" />
    </>
  );
}
