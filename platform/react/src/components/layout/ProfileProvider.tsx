import type { ReactNode } from 'react';
import { Loader } from '@openpeepshq/react-ui';
import { useHasAuthToken } from '../../contexts/openpeeps/hooks/useHasAuthToken';
import { useOptionalPathname } from '../../contexts/router';
import { IdentityContext } from './IdentityContext';
import { useProfileIdentity } from './useProfileIdentity';

export interface ProfileProviderProps {
  children?: ReactNode;
}

/**
 * Translation of @openpeepshq/svelte/components/layout/ProfileProvider.svelte.
 * Pulls profile/account/profileSettings via the openpeeps API and provides
 * them through React context. Applies profile `language` to i18n.
 */
export function ProfileProvider({ children }: ProfileProviderProps) {
  const hasToken = useHasAuthToken();
  const pathname = useOptionalPathname();
  const authShell = pathname?.startsWith('/auth') ?? false;
  const { value, profileQuery, accountQuery, settingsQuery } =
    useProfileIdentity();

  // Auth routes: never block the shell on identity queries (stale token, API
  // down, hung proxy). Login/register still mount the same data hooks for context.
  const queries =
    !hasToken || authShell
      ? []
      : ([
          profileQuery && {
            // Use `isLoading` (pending + fetching): disabled queries stay `isPending`
            // in TanStack Query v5 without data, which would otherwise block the shell forever.
            isPending: profileQuery.isLoading,
            isSuccess: profileQuery.isSuccess,
            data: profileQuery.data,
          },
          accountQuery && {
            isPending: accountQuery.isLoading,
            isSuccess: accountQuery.isSuccess,
            data: accountQuery.data,
          },
          value.profile && settingsQuery
            ? {
                isPending: settingsQuery.isLoading,
                isSuccess: settingsQuery.isSuccess,
                data: settingsQuery.data,
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
