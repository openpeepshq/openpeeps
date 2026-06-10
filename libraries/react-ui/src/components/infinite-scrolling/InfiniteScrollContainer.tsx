import * as React from 'react';
import { Loader } from '@/components/loaders/Loader';
import { getUniqueBy } from '@/lib/utils';
import { ScrollObserver, type InfiniteQueryLike } from './ScrollObserver';

export interface InfiniteScrollContainerQueryResult<D> extends InfiniteQueryLike {
  data?: { pages?: D[][] };
  isPending: boolean;
  isSuccess: boolean;
}

export interface InfiniteScrollContainerProps<D> {
  query: InfiniteScrollContainerQueryResult<D>;
  children: (ctx: { list: D[] }) => React.ReactNode;
  empty?: React.ReactNode;
  uniqueBy: (item: D) => string;
  scrollTop?: boolean;
  additionalItems?: D[];
}

export function InfiniteScrollContainer<D>({
  query,
  children,
  empty,
  uniqueBy,
  scrollTop = false,
  additionalItems = [],
}: InfiniteScrollContainerProps<D>) {
  const list = React.useMemo(
    () =>
      getUniqueBy(
        [...((query.data?.pages ?? []).flat() as D[]), ...additionalItems],
        uniqueBy,
      ),
    [query.data, additionalItems, uniqueBy],
  );

  if (!query) return null;

  return (
    <Loader
      queries={[
        {
          isPending: query.isPending,
          isSuccess: query.isSuccess,
          data: query.data,
        },
      ]}
    >
      {list.length ? (
        <>
          {scrollTop && <ScrollObserver query={query} />}
          {children({ list })}
          {!scrollTop && <ScrollObserver query={query} />}
        </>
      ) : (
        empty
      )}
    </Loader>
  );
}
