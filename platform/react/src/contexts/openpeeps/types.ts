import type { OpenpeepsClient } from '@openpeepshq/client';
import type { buildOpenpeepsApi } from './hooks';
import type { ProfileWithMeta, PublicAccount } from '@openpeepshq/common';
import type { QueryClient } from '@tanstack/react-query';

export interface OpenpeepsContextValue {
  openpeepsApi: ReturnType<typeof buildOpenpeepsApi>;
  client: OpenpeepsClient;
  currentProfile: ProfileWithMeta | undefined;
  currentAccount: PublicAccount | undefined;
  queryClient: QueryClient;
  /**
   * Base URL the client is built against (may be empty for same-origin).
   * Used to construct absolute URLs for endpoints outside the API subtree,
   * e.g. the ICS feed.
   */
  baseUrl: string;
}
