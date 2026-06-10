import { useEffect, useMemo, useRef } from 'react';
import { Rss } from 'lucide-react';
import type { PublicPost, SuccessFailureResponse } from '@openpeeps/common/types';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useT } from '../../../../i18n';
import { CardEvent } from '../../types/event/CardEvent';

export type EventsFeedQuery = UseInfiniteQueryResult<
  InfiniteData<PublicPost[], unknown>,
  SuccessFailureResponse
>;

export interface EventsFeedProps {
  query: EventsFeedQuery;
}

export function EventsFeed({ query }: EventsFeedProps) {
  const t = useT();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const posts = useMemo(() => {
    const flat = (query.data?.pages ?? []).flat();
    const seen = new Set<string>();
    return flat.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [query.data]);

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

  if (posts.length === 0) {
    return (
      <div className="flex h-96 w-full flex-col items-center justify-center gap-y-4">
        <Rss className="text-surface-300 size-20" />
        <p className="text-xl">
          {t('feed.empty', { defaultValue: 'No events yet.' })}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {posts.map((post) => (
        <CardEvent key={post.id} post={post} />
      ))}
      <div ref={sentinelRef} aria-hidden="true" className="col-span-full h-8" />
      {query.isFetchingNextPage ? (
        <div className="col-span-full flex justify-center py-4 text-sm text-muted-foreground">
          {t('common.loadingMore', { defaultValue: 'Loading more…' })}
        </div>
      ) : null}
    </div>
  );
}
