import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCredentialsStore, useOpenpeeps, useT } from '@openpeepshq/react';

export function SsoCallback() {
  const t = useT();
  const navigate = useNavigate();
  const { client } = useOpenpeeps();
  const { credentialsStore } = useCredentialsStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fragmentParams = Object.fromEntries(
      new URLSearchParams(location.hash.replace(/^#/, '')).entries(),
    );
    const queryParams = Object.fromEntries(
      new URLSearchParams(location.search).entries(),
    );
    const data = { ...queryParams, ...fragmentParams };

    client.sso.generic
      .authenticate({ data })
      .then(async (res) => {
        if ('data' in res) {
          await credentialsStore.set({ token: res.data.token });
          navigate('/feeds/local');
        } else {
          setError(
            (res.error as { error?: string })?.error ?? 'Authentication failed',
          );
        }
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  }, [client, credentialsStore, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <h1 className="text-error text-2xl font-semibold">
          {t('common.error', { defaultValue: 'Error' })}: {error}
        </h1>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-semibold">
        {t('auth.sso.signingIn', { defaultValue: 'Signing you in…' })}
      </h1>
    </div>
  );
}
