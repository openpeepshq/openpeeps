import { useCallback, useEffect, useState } from 'react';
import type { OAuthAuthorizationRequest } from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCredentialsStore } from '../../contexts/credentialsStore';
import { useT } from '../../i18n/context';
import { apiErrorMessage } from '../../lib/apiErrorMessage';

// i18next treats ':' as its namespace separator, so `posts:read` cannot be a
// key segment as-is.
export const oauthScopeLabelKey = (scope: string) =>
  `oauth.scopes.${scope.replace(':', '_')}`;

export const useOAuthConsent = (
  request: Record<string, string>,
  onRedirect: (url: string) => void,
) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { credentialsStore } = useCredentialsStore();
  const infoQuery = openpeepsApi.useOAuthAuthorizationInfo(request);
  const authorize = openpeepsApi.authorizeOAuthAction();
  const [signedIn, setSignedIn] = useState<boolean | undefined>();
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    void credentialsStore.get().then((creds) => setSignedIn(!!creds?.token));
  }, [credentialsStore]);

  const info = infoQuery.data;

  const decide = useCallback(
    async (approve: boolean) => {
      setError(undefined);
      setDeciding(true);
      try {
        const { redirectUrl } = await authorize({
          ...(request as OAuthAuthorizationRequest),
          approve,
        });
        onRedirect(redirectUrl);
      } catch (err) {
        setError(apiErrorMessage(err, t));
        setDeciding(false);
      }
    },
    [authorize, onRedirect, request, t],
  );

  useEffect(() => {
    if (info?.status === 'redirect') onRedirect(info.redirectUrl);
    else if (info?.status === 'consent' && info.autoApprove) void decide(true);
    // decide is stable within a render cycle, so the effect runs once per
    // loaded description (info) without a stale-closure hazard if the hook
    // body later captures changing state.
  }, [info, decide]);

  return {
    signedIn,
    info,
    isLoading: infoQuery.isLoading,
    error:
      error ??
      (infoQuery.error ? apiErrorMessage(infoQuery.error, t) : undefined),
    deciding: deciding || (info?.status === 'consent' && info.autoApprove),
    decide,
  };
};
