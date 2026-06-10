import { useMemo, useRef, useEffect } from 'react';
import type { PublicPost } from '@openpeeps/common/types';
import { buildThreads } from '@openpeeps/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { FeedPost } from './FeedPost';
import { ThreadedFeed } from './feed/threaded/ThreadedFeed';
import { ReplyBox } from './ReplyBox';

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
  const { openpeepsApi } = useOpenpeeps();
  const contextQuery = openpeepsApi.usePostContext(post.id);
  const postRef = useRef<HTMLDivElement | null>(null);

  const ancestryThread = useMemo(
    () => (contextQuery.data ? buildThreads(contextQuery.data.ancestors)[0] : undefined),
    [contextQuery.data],
  );
  const descendentThreads = useMemo(
    () =>
      (contextQuery.data && buildThreads(contextQuery.data.descendants)) || [],
    [contextQuery.data],
  );

  useEffect(() => {
    postRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [post.id]);

  if (contextQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <>
      {ancestryThread ? <ThreadedFeed thread={ancestryThread} isAncestors /> : null}
      <div ref={postRef}>
        {children ?? (
          <FeedPost
            post={post}
            deleteCallback={deleteCallback}
            noReactionHeader
          />
        )}
      </div>
      <ReplyBox post={post} />
      {descendentThreads.map((thread) => (
        <ThreadedFeed key={thread.id} thread={thread} isDescendants />
      ))}
      <div className="h-[70vh]" />
    </>
  );
}
