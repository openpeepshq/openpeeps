import { useEffect, type ReactNode } from 'react';
import { createStore, useStore } from './createStore';
import type { PageHeader } from './types';

export const pageHeaderStore = createStore<PageHeader | undefined>(undefined);

export const usePageHeader = () => useStore(pageHeaderStore);

/**
 * Mount-scoped page header. Equivalent to `setPageHeader` from
 * @openpeeps/svelte (which used `onMount` + cleanup).
 *
 * Accepts primitives so deps stay stable across renders without forcing
 * callers to memoize. The value is refreshed whenever any of `title`,
 * `actions`, or `testId` changes; the store is cleared on unmount only.
 */
export const useSetPageHeader = (
  title?: ReactNode,
  actions?: ReactNode,
  testId?: string,
) => {
  useEffect(() => {
    pageHeaderStore.set({ title, actions, testId });
  }, [title, actions, testId]);

  useEffect(() => {
    return () => {
      pageHeaderStore.set(undefined);
    };
  }, []);
};
