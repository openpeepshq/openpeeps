import { useEffect, useMemo, type ReactNode } from 'react';
import { Loader } from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useHasAuthToken } from '../../contexts/openpeeps/hooks/useHasAuthToken';
import { useOptionalPathname } from '../../contexts/router';
import { useI18n, resolveProfileLanguage } from '../../i18n';
import { useServerInfo } from '../server-data';
import { IdentityContext, type IdentityContextValue } from './IdentityContext';

export interface ProfileProviderProps {
  children?: ReactNode;
}

/**
 * Translation of @openpeepshq/svelte/components/layout/ProfileProvider.svelte.
 * Pulls profile/account/profileSettings via the openpeeps API and provides
 * them through React context. Applies profile `language` to i18n.
 */
export function ProfileProvider({ children }: ProfileProviderProps) {
  const { openpeepsApi, currentProfile, currentAccount } = useOpenpeeps();
  const hasToken = useHasAuthToken();
  const pathname = useOptionalPathname();
  const authShell = pathname?.startsWith('/auth') ?? false;
  const { i18n } = useI18n();
  const serverInfo = useServerInfo();
  const communityDefaultLanguage =
    serverInfo.communityConfig?.settings?.defaultLanguage;

  const currentProfileQuery = openpeepsApi.useCurrentProfile?.();
  const currentAccountQuery = openpeepsApi.useCurrentAccount?.();
  const currentProfileSettingsQuery =
    openpeepsApi.useCurrentProfileSettings?.();

  const profileSettings = currentProfileSettingsQuery?.data;

  useEffect(() => {
    const lang = resolveProfileLanguage(
      profileSettings?.language,
      communityDefaultLanguage,
    );
    if (i18n.language === lang) return;
    void i18n.changeLanguage(lang);
  }, [profileSettings?.language, communityDefaultLanguage, i18n]);

  const value = useMemo<IdentityContextValue>(
    () => ({
      // Prefer react-query data so membership/role changes (e.g. after creating
      // a group) are not masked by the login-time `currentProfile` snapshot.
      profile: currentProfileQuery?.data ?? currentProfile,
      account: currentAccountQuery?.data ?? currentAccount,
      profileSettings,
    }),
    [
      currentProfile,
      currentAccount,
      currentProfileQuery?.data,
      currentAccountQuery?.data,
      profileSettings,
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
