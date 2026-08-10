import { useEffect, type ReactNode } from 'react';
import { getTheme, isStripeActive } from '@openpeepshq/common';
import { useT } from '../../i18n';
import { useServerInfo } from '../server-data';
import { useCurrentProfileSettings } from './IdentityContext';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCredentialsStore } from '../../contexts/credentialsStore';
import { useHasAuthToken } from '../../contexts/openpeeps/hooks/useHasAuthToken';

export interface AuthLayoutProps {
  description?: ReactNode;
  children?: ReactNode;
  noRedirect?: boolean;
  /**
   * Called when the auth layer wants to redirect the user — defaults to
   * `window.location.assign(url)`. Pass your router's navigate to avoid full
   * reloads.
   */
  navigate?: (url: string) => void;
  /** Forwarded as `?redirect=...` after login. */
  redirectTo?: string | null;
  /** True when `?payment=` is present in the URL. */
  hasPayment?: boolean;
}

/**
 * Translation of @openpeepshq/svelte/components/layout/Auth.svelte. Renders the
 * standard auth split-pane shell and triggers a redirect once an authenticated
 * profile is detected.
 */
export function AuthLayout({
  description,
  children,
  noRedirect = false,
  navigate,
  redirectTo,
  hasPayment = false,
}: AuthLayoutProps) {
  const serverInfo = useServerInfo();
  const profileSettings = useCurrentProfileSettings();
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { credentialsStore } = useCredentialsStore();
  const hasToken = useHasAuthToken();

  const userTheme = getTheme(serverInfo.communityConfig, profileSettings);
  const stripeEnabled = !!serverInfo.payments?.stripe?.paidMembership?.enabled;
  const tagLine = serverInfo.communityConfig?.info?.tagLine;

  const profileQuery = openpeepsApi.useCurrentProfile?.();
  // Mirror Auth.svelte: only check payment status for a signed-in user on a
  // Stripe-enabled community, otherwise the request 401s for guests.
  const paymentQuery = openpeepsApi.usePaymentStatus({
    enabled: hasToken && stripeEnabled && !noRedirect,
  });

  const go = (url: string) => {
    if (navigate) navigate(url);
    else if (typeof window !== 'undefined') window.location.assign(url);
  };

  useEffect(() => {
    if (noRedirect) return;
    let cancelled = false;
    (async () => {
      const creds = await credentialsStore.get();
      if (!creds?.token) return;

      if (stripeEnabled && paymentQuery?.isSuccess) {
        if (isStripeActive(paymentQuery.data)) {
          if (cancelled) return;
          if (hasPayment) go('/welcome');
          else if (
            !profileQuery?.isFetching &&
            profileQuery?.isSuccess &&
            profileQuery.data?.type === 'local'
          ) {
            go(redirectTo || '/feeds/local');
          }
        }
      } else if (
        !profileQuery?.isFetching &&
        profileQuery?.isSuccess &&
        profileQuery.data?.type === 'local'
      ) {
        if (cancelled) return;
        go(redirectTo || '/feeds/local');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    noRedirect,
    stripeEnabled,
    hasPayment,
    redirectTo,
    profileQuery?.isFetching,
    profileQuery?.isSuccess,
    profileQuery?.data,
    paymentQuery?.isSuccess,
    paymentQuery?.data,
  ]);

  return (
    <div className="h-screen w-full overflow-hidden md:flex md:h-full">
      <div className="flex-1">
        {userTheme.backgroundAuth && (
          <img
            src={userTheme.backgroundAuth}
            alt="Authentication background"
            className="hidden h-full w-full object-cover md:block"
          />
        )}
      </div>

      <div className="bg-card flex h-full w-full flex-1 justify-center overflow-y-auto md:h-auto">
        <div className="mx-auto h-fit space-y-4 p-4 md:mx-10 md:w-[60%]">
          {userTheme.logoSmall && (
            <img
              src={userTheme.logoSmall}
              alt="logo"
              className="mb-6 h-6 md:h-10"
            />
          )}
          {description ?? (
            <p className="text-sm md:text-lg">{tagLine || t('auth.tagline')}</p>
          )}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
