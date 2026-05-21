import type { RequestEvent } from '@sveltejs/kit';
import type { TokenResponse } from '@openpeeps/common/types';
import {
  refreshSignedAccessToken,
  verifySignedAccessToken,
} from '@openpeeps/core/accessTokens';
import {
  checkSubscription,
  createStripeCheckoutUrl,
} from '@openpeeps/core/stripe';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { loadCurrentAccount, loadCurrentProfile } from '$lib/server/auth';

export const refreshAuthTokenHandler = async (
  event: RequestEvent,
): Promise<TokenResponse> => {
  const authHeader = event.request.headers.get('authorization');
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    throw authNeeded();
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    throw authNeeded();
  }

  const accessToken = await refreshSignedAccessToken(token);
  if (!accessToken?.signedToken) {
    throw forbidden('auth.refresh.invalid-or-expired');
  }

  const authorization = await verifySignedAccessToken(accessToken.signedToken);
  if (!authorization) {
    throw forbidden('auth.refresh.invalid-or-expired');
  }

  const profile = await loadCurrentProfile(authorization);
  const account = await loadCurrentAccount(authorization);

  let checkoutUrl: string | undefined;
  if (profile?.type === 'local' && account) {
    const subscriptionNeeded = !(await checkSubscription(profile, account, true));
    checkoutUrl = subscriptionNeeded
      ? await createStripeCheckoutUrl(profile, account)
      : undefined;
  }

  return { success: true, token: accessToken.signedToken, checkoutUrl };
};
