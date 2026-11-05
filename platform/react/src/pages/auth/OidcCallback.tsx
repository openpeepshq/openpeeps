import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCredentialsStore, useT, postLoginLandingPath } from '../../index';
import { useServerInfo } from '../../components';

/**
 * Lands the browser after the server's OIDC callback has exchanged the code.
 * The server redirects here with either `?token=` (success) or `?error=`.
 */
export function OidcCallback() {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { credentialsStore } = useCredentialsStore();
  const serverInfo = useServerInfo();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (token) {
      void credentialsStore
        .set({ token })
        .then(() => navigate(postLoginLandingPath(serverInfo.communityConfig)));
      return;
    }

    setError(
      t('auth.sso.noToken', {
        defaultValue:
          'No token or error received from authentication provider.',
      }),
    );
  }, [searchParams, credentialsStore, navigate, t, serverInfo.communityConfig]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 text-center">
      {error ? (
        <h1 className="text-error text-2xl font-semibold">
          {t('common.error', { defaultValue: 'Error' })}: {error}
        </h1>
      ) : (
        <h1 className="text-2xl font-semibold">
          {t('auth.sso.signingIn', { defaultValue: 'Signing you in…' })}
        </h1>
      )}
    </div>
  );
}
