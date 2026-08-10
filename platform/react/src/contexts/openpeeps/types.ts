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
}
