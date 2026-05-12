import { useMemo, type ReactNode } from 'react';
import { Loader } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useHasAuthToken } from '../../contexts/openpeeps/hooks/useHasAuthToken';
import { useOptionalPathname } from '../../contexts/router';
import { IdentityContext, type IdentityContextValue } from './IdentityContext';

export interface ProfileProviderProps {
  children?: ReactNode;
}

/**
 * Translation of @openpeeps/svelte/components/layout/ProfileProvider.svelte.
 * Pulls profile/account/profileSettings via the openpeeps API and provides
 * them through React context.
 */
export function ProfileProvider({ children }: ProfileProviderProps) {
  const { openpeepsApi, currentProfile, currentAccount } = useOpenpeeps();
  const hasToken = useHasAuthToken();
  const pathname = useOptionalPathname();
  const authShell = pathname?.startsWith('/auth') ?? false;

  const currentProfileQuery = openpeepsApi.useCurrentProfile?.();
  const currentAccountQuery = openpeepsApi.useCurrentAccount?.();
  const currentProfileSettingsQuery =
    openpeepsApi.useCurrentProfileSettings?.();

  const value = useMemo<IdentityContextValue>(
    () => ({
      profile: currentProfile ?? currentProfileQuery?.data,
      account: currentAccount ?? currentAccountQuery?.data,
      profileSettings: currentProfileSettingsQuery?.data,
    }),
    [
      currentProfile,
      currentAccount,
      currentProfileQuery?.data,
      currentAccountQuery?.data,
      currentProfileSettingsQuery?.data,
    ],
  );

  // Auth routes: never block the shell on identity queries (stale token, API
  // down, hung proxy). Login/register still mount the same data hooks for context.
  const queries =
    !hasToken || authShell
      ? []
      : ([
        currentProfileQuery && {
          // Use `isLoading` (pending + fetching): disabled queries stay `isPending`
          // in TanStack Query v5 without data, which would otherwise block the shell forever.
          isPending: currentProfileQuery.isLoading,
          isSuccess: currentProfileQuery.isSuccess,
          data: currentProfileQuery.data,
        },
        currentAccountQuery && {
          isPending: currentAccountQuery.isLoading,
          isSuccess: currentAccountQuery.isSuccess,
          data: currentAccountQuery.data,
        },
        value.profile && currentProfileSettingsQuery
          ? {
              isPending: currentProfileSettingsQuery.isLoading,
              isSuccess: currentProfileSettingsQuery.isSuccess,
              data: currentProfileSettingsQuery.data,
            }
          : null,
      ].filter(Boolean) as {
        isPending: boolean;
        isSuccess: boolean;
        data: unknown;
      }[]);

  return (
    <IdentityContext.Provider value={value}>
      <Loader queries={queries} ignoreErrors>
        {children}
      </Loader>
    </IdentityContext.Provider>
  );
}
