import * as React from 'react';
import type { PartialQueryObserverResult } from '@/types';

export interface WaitForQueriesProps {
  queries?: PartialQueryObserverResult<unknown>[];
  promises?: Promise<unknown>[];
  ignoreErrors?: boolean;
  loading?: React.ReactNode;
  success?: React.ReactNode;
  error?: React.ReactNode;
  children?: React.ReactNode;
}

type PromiseState = 'pending' | 'resolved' | 'rejected';

/**
 * React port of `WaitForQueries.svelte`. Awaits the provided promises and
 * inspects react-query observer results to decide which slot to render.
 */
export function WaitForQueries({
  queries,
  promises,
  ignoreErrors = false,
  loading,
  success,
  error,
  children,
}: WaitForQueriesProps) {
  const [promiseState, setPromiseState] = React.useState<PromiseState>(() =>
    promises && promises.length ? 'pending' : 'resolved',
  );

  React.useEffect(() => {
    if (!promises || promises.length === 0) {
      setPromiseState('resolved');
      return;
    }
    let cancelled = false;
    setPromiseState('pending');
    Promise.all(promises)
      .then(() => {
        if (!cancelled) setPromiseState('resolved');
      })
      .catch(() => {
        if (!cancelled) setPromiseState('rejected');
      });
    return () => {
      cancelled = true;
    };
  }, [promises]);

  let slot: React.ReactNode = null;
  if (promiseState === 'pending') {
    slot = loading;
  } else if (promiseState === 'rejected') {
    slot = ignoreErrors ? success : error;
  } else if (queries?.some((q) => q.isPending)) {
    slot = loading;
  } else if (!queries || queries.every((q) => q.isSuccess) || ignoreErrors) {
    slot = success;
  } else {
    slot = error;
  }

  return (
    <>
      {slot}
      {children}
    </>
  );
}
