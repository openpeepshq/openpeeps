import { useMemo } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useT } from '@openpeeps/react';

/**
 * Shown when an OIDC sign-in created a new account that requires admin
 * approval before it can be used.
 */
export function OidcPending() {
  const t = useT();
  const [searchParams] = useSearchParams();

  const { pendingEmail, providerName } = useMemo(() => {
    const providerId = searchParams.get('provider') || '';
    const state = searchParams.get('state');
    const fallback = {
      pendingEmail: t('auth.sso.yourEmail', { defaultValue: 'your email' }),
      providerName: providerId || 'Administrator',
    };
    if (!state) return fallback;
    try {
      const parsed = JSON.parse(atob(state)) as {
        pendingEmail?: string;
        providerName?: string;
      };
      return {
        pendingEmail: parsed.pendingEmail || fallback.pendingEmail,
        providerName: parsed.providerName || fallback.providerName,
      };
    } catch {
      return fallback;
    }
  }, [searchParams, t]);

  return (
    <div className="mx-auto mt-8 max-w-md text-center">
      <div className="border-surface-300 border-t-primary-500 mx-auto size-8 animate-spin rounded-full border-4" />
      <h1 className="mt-4 text-2xl font-semibold">
        {t('auth.sso.pendingTitle', { defaultValue: 'Account Pending Review' })}
      </h1>
      <p className="text-surface-600 mt-4">
        {t('auth.sso.pendingBody', {
          defaultValue:
            'A new account for {{email}} requires administrator approval.',
          email: pendingEmail,
        })}
      </p>
      <p className="text-surface-500 mt-2 text-sm">
        {t('auth.sso.pendingContact', {
          defaultValue:
            'Please contact the {{provider}} administrator to have your account reviewed.',
          provider: providerName,
        })}
      </p>
      <div className="mt-6">
        <RouterLink to="/auth/login" className="op-anchor">
          {t('auth.sso.backToLogin', { defaultValue: 'Back to login' })}
        </RouterLink>
      </div>
    </div>
  );
}
