import type { OAuthGrant } from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';

export const useConnectedApps = () => {
  const { openpeepsApi } = useOpenpeeps();
  const grantsQuery = openpeepsApi.useOAuthGrants();
  const revokeGrant = openpeepsApi.revokeOAuthGrantAction();

  return {
    grants: (grantsQuery.data ?? []) as OAuthGrant[],
    isLoading: grantsQuery.isLoading,
    revoke: (clientId: string) => revokeGrant({ clientId }),
  };
};
