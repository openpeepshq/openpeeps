import { useEffect, useMemo } from 'react';
import { Button, Toast } from '@openpeepshq/react-ui';
import { useNavigate, useSearchParams, useT } from '../../index';
import { oauthScopeLabelKey, useOAuthConsent } from '../../hooks';

const assign = (url: string) => window.location.assign(url);

export const OAuthAuthorize = () => {
  const t = useT();
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const request = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );
  const { signedIn, info, isLoading, error, deciding, decide } =
    useOAuthConsent(request, assign);

  useEffect(() => {
    if (signedIn !== false) return;
    const self = `/oauth/authorize?${searchParams.toString()}`;
    void navigate(`/auth/login?redirect=${encodeURIComponent(self)}`);
  }, [signedIn, searchParams, navigate]);

  const consent = info?.status === 'consent' ? info : undefined;

  return (
    <div className="mx-auto mt-8 max-w-md space-y-4 p-4">
      {error ? (
        <Toast variant="error">{error}</Toast>
      ) : !consent || isLoading || deciding ? (
        <div className="border-border border-t-primary mx-auto size-8 animate-spin rounded-full border-4" />
      ) : (
        <section className="space-y-4 rounded-md border p-4">
          <div className="flex items-center gap-3">
            {consent.client.logoUri ? (
              <img
                src={consent.client.logoUri}
                alt=""
                className="size-10 rounded-md"
              />
            ) : null}
            <h1 className="text-xl font-semibold">
              {t('oauth.consent.title', {
                defaultValue: '{{client}} wants to access your account',
                client: consent.client.name,
              })}
            </h1>
          </div>
          {consent.client.clientUri ? (
            <p className="text-muted-foreground break-all text-sm">
              {consent.client.clientUri}
            </p>
          ) : null}
          <p className="text-sm">
            {t('oauth.consent.scopesIntro', {
              defaultValue: 'This will allow it to:',
            })}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {consent.scopes.map((scope) => (
              <li key={scope}>
                {t(oauthScopeLabelKey(scope), { defaultValue: scope })}
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="outline" action={() => decide(false)}>
              {t('oauth.consent.deny', { defaultValue: 'Deny' })}
            </Button>
            <Button variant="default" action={() => decide(true)}>
              {t('oauth.consent.approve', { defaultValue: 'Allow' })}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};
