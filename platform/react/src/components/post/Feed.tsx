import { useEffect, useRef, useMemo } from 'react';
import { Rss } from 'lucide-react';
import type { PublicPost, SuccessFailureResponse } from '@openpeeps/common/types';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';

import { useT } from '../../i18n';
import { FeedPost } from './FeedPost';
import { PinnedPost } from './PinnedPost';

export type FeedQuery = UseInfiniteQueryResult<
  InfiniteData<PublicPost[], unknown>,
  SuccessFailureResponse
>;

export interface FeedProps {
  query: FeedQuery;
  /** When true, hides the "posted in group" banner because we're already there. */
  inGroup?: boolean;
  /** When set, the post with this id is rendered first (pinned). */
  pinnedPostId?: string;
}

/**
 * Translation of `@openpeeps/svelte/components/core/post/feed/chronological/Feed.svelte`.
 * Wires a TanStack `useInfiniteQuery` result to an IntersectionObserver-backed
 * loader and renders each post as a `<FeedPost>`.
 *
 * The Svelte version also has a `<PinnedPost>` component that fetches the
 * pinned post by id; here we filter it out of the chronological list and
 * leave the actual pinned rendering to a future port.
 */
export function Feed({ query, inGroup = false, pinnedPostId }: FeedProps) {
  const t = useT();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const posts = useMemo(() => {
    const flat = (query.data?.pages ?? []).flat();
    const seen = new Set<string>();
    const out: PublicPost[] = [];
    for (const p of flat) {
      if (seen.has(p.id)) continue;
      if (pinnedPostId && p.id === pinnedPostId) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [query.data, pinnedPostId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (
        entry.isIntersecting &&
        query.hasNextPage &&
        !query.isFetchingNextPage
      ) {
        void query.fetchNextPage();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [query]);

  if (query.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (posts.length === 0 && !pinnedPostId) {
    return (
      <div className="flex h-96 w-full flex-col items-center justify-center gap-y-4">
        <Rss className="text-surface-300 size-20" />
        <p className="text-xl">
          {t('feed.empty', { defaultValue: 'No posts yet.' })}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {pinnedPostId ? (
        <PinnedPost pinnedPostId={pinnedPostId} inGroup={inGroup} />
      ) : null}
      {posts.map((post) => (
        <a
          key={post.id}
          href={`/posts/${post.repost ? post.repost.id : post.id}`}
          className="block"
        >
          <FeedPost post={post} inGroup={inGroup} showReplyTo />
        </a>
      ))}

      <div ref={sentinelRef} aria-hidden="true" className="h-8" />

      {query.isFetchingNextPage && (
        <div className="flex justify-center py-4 text-sm text-muted-foreground">
          {t('common.loadingMore', { defaultValue: 'Loading more…' })}
        </div>
      )}
    </div>
  );
}
