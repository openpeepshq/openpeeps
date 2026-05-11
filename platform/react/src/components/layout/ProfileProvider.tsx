import { useMemo, type ReactNode } from 'react';
import { Loader } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
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

  const queries = [
    currentProfileQuery && {
      isPending: currentProfileQuery.isPending,
      isSuccess: currentProfileQuery.isSuccess,
      data: currentProfileQuery.data,
    },
    currentAccountQuery && {
      isPending: currentAccountQuery.isPending,
      isSuccess: currentAccountQuery.isSuccess,
      data: currentAccountQuery.data,
    },
    value.profile && currentProfileSettingsQuery
      ? {
          isPending: currentProfileSettingsQuery.isPending,
          isSuccess: currentProfileSettingsQuery.isSuccess,
          data: currentProfileSettingsQuery.data,
        }
      : null,
  ].filter(Boolean) as {
    isPending: boolean;
    isSuccess: boolean;
    data: unknown;
  }[];

  return (
    <IdentityContext.Provider value={value}>
      <Loader queries={queries} ignoreErrors>
        {children}
      </Loader>
    </IdentityContext.Provider>
  );
}
