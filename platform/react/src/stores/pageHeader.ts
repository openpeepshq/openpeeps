import { useEffect } from 'react';
import { createStore, useStore } from './createStore';
import type { PageHeader } from './types';

export const pageHeaderStore = createStore<PageHeader | undefined>(undefined);

export const usePageHeader = () => useStore(pageHeaderStore);

/**
 * Mount-scoped page header. Equivalent to `setPageHeader` from
 * @openpeeps/svelte (which used `onMount` + cleanup).
 */
export const useSetPageHeader = (pageHeader: PageHeader | undefined) => {
  useEffect(() => {
    pageHeaderStore.set(pageHeader);
    return () => {
      pageHeaderStore.set(undefined);
    };
  }, [pageHeader]);
};
