import { useEffect, type ReactNode } from 'react';
import {
  initializeNewPostStores,
  initializePageStores,
  pageHeaderStore,
  usePageHeader,
} from '../../stores';
import { useServerInfo } from '../server-data';

export interface OpenpeepsContextProviderProps {
  children?: ReactNode;
  /** Reset the page header on route changes. Pass the current pathname. */
  pathname?: string;
}

/**
 * Translation of @openpeeps/svelte/components/layout/OpenpeepsContextProvider.
 * Initialises the new-post + page-level stores and updates `document.title`
 * based on the active page header.
 */
export function OpenpeepsContextProvider({
  children,
  pathname,
}: OpenpeepsContextProviderProps) {
  const serverInfo = useServerInfo();
  const pageHeader = usePageHeader();

  useEffect(() => {
    initializeNewPostStores(!!serverInfo.publicContent);
    initializePageStores();
  }, [serverInfo.publicContent]);

  // Match Svelte's `onNavigate` clearing of the page header
  useEffect(() => {
    pageHeaderStore.set({});
  }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const name = serverInfo.communityConfig?.info.name ?? '';
    const title =
      pageHeader && typeof pageHeader.title === 'string'
        ? `${name} - ${pageHeader.title}`
        : name;
    document.title = title;
  }, [pageHeader, serverInfo.communityConfig?.info.name]);

  return <>{children}</>;
}
