import { useLayoutEffect, type ReactNode } from 'react';
import { createStore, useStore } from './createStore';
import type { PageHeader } from './types';

export const pageHeaderStore = createStore<PageHeader | undefined>(undefined);

export const usePageHeader = () => useStore(pageHeaderStore);

/**
 * Mount-scoped page header. Equivalent to `setPageHeader` from
 * @openpeepshq/svelte (which used `onMount` + cleanup).
 *
 * Accepts primitives so deps stay stable across renders without forcing
 * callers to memoize. The value is refreshed whenever any of `title`,
 * `actions`, or `testId` changes. Cleanup runs in the same useLayoutEffect
 * so unmount clears before the next page's layout effect sets its header
 * (a separate useEffect cleanup would run after paint and wipe the new page).
 */
export const useSetPageHeader = (
  title?: ReactNode,
  actions?: ReactNode,
  testId?: string,
) => {
  useLayoutEffect(() => {
    pageHeaderStore.set({ title, actions, testId });
    return () => {
      pageHeaderStore.set(undefined);
    };
  }, [title, actions, testId]);
};
