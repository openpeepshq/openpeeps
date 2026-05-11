import { useInfiniteScroll } from '@/lib/scrolling';

export interface InfiniteQueryLike {
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage: () => void;
}

export interface ScrollObserverProps {
  query: InfiniteQueryLike;
}

export function ScrollObserver({ query }: ScrollObserverProps) {
  const ref = useInfiniteScroll<HTMLDivElement>(
    () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
    { enabled: !!query.hasNextPage },
  );

  return (
    <>
      {query.hasNextPage && <div ref={ref} className="h-4 w-full" aria-hidden="true" />}
      {query.isFetchingNextPage && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2 text-surface-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-surface-300 border-t-primary" />
          </div>
        </div>
      )}
    </>
  );
}
