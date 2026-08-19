import { useEffect, type ReactNode } from 'react';
import { getTheme, isStripeActive } from '@openpeepshq/common';
import { Link } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useServerInfo } from '../server-data';
import { Avatar } from '../profile/Avatar';
import { useCurrentProfileSettings } from './IdentityContext';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCredentialsStore } from '../../contexts/credentialsStore';
import { useHasAuthToken } from '../../contexts/openpeeps/hooks/useHasAuthToken';

const HOME_HREF = '/feeds/local';

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
  const communityName = serverInfo.communityConfig?.info?.name;

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
            go(redirectTo || HOME_HREF);
          }
        }
      } else if (
        !profileQuery?.isFetching &&
        profileQuery?.isSuccess &&
        profileQuery.data?.type === 'local'
      ) {
        if (cancelled) return;
        go(redirectTo || HOME_HREF);
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

  const profile = profileQuery?.data;
  const signedInLocal = profile?.type === 'local';
  const signedInName =
    profile?.displayName?.trim() ||
    (profile?.handle ? `@${profile.handle}` : '');
  const goHome = () => go(HOME_HREF);

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

      <main className="bg-surface flex h-full w-full flex-1 justify-center overflow-y-auto md:h-auto">
        <div className="mx-auto h-fit space-y-4 p-4 md:mx-10 md:w-[60%]">
          {signedInLocal && profile ? (
            <div className="flex items-center gap-3 text-sm">
              <Avatar profile={profile} size={2} borderless />
              <div className="min-w-0">
                <p className="truncate">
                  {t('auth.signedInAs', {
                    defaultValue: 'Signed in as {{name}}',
                    name: signedInName,
                  })}
                </p>
                <Link action={goHome} className="text-sm">
                  {t('auth.goToCommunity', {
                    defaultValue: 'Go to community',
                  })}
                </Link>
              </div>
            </div>
          ) : null}
          {userTheme.logoSmall && (
            <a
              href={HOME_HREF}
              className="mb-6 inline-block"
              onClick={(event) => {
                event.preventDefault();
                goHome();
              }}
            >
              <img
                src={userTheme.logoSmall}
                alt={communityName ?? 'logo'}
                className="h-6 md:h-10"
              />
            </a>
          )}
          {description ?? (
            <p className="text-sm md:text-lg">{tagLine || t('auth.tagline')}</p>
          )}
          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}
