import type { RequestHandler } from './$types';
import { callback as oidcCallback } from '$lib/server/api/handlers/sso/oidc';
import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, url }) => {
  const providerId = params.id;
  const queryParams = Object.fromEntries(url.searchParams);
  const origin = url.origin;

  try {
    const result = await oidcCallback(providerId, queryParams);

    if (result.success && result.token) {
      const callbackUrl = new URL(`/auth/sso/oidc/${providerId}/callback`, origin);
      callbackUrl.searchParams.set('token', result.token);
      throw redirect(302, callbackUrl.toString());
    }

    if (result.redirectUrl) {
      throw redirect(302, result.redirectUrl);
    }

    // Fallback: redirect with error
    const errorUrl = new URL(`/auth/sso/oidc/${providerId}/callback`, origin);
    errorUrl.searchParams.set('error', result.error || 'Authentication failed');
    throw redirect(302, errorUrl.toString());
  } catch (err: unknown) {
    // Re-throw SvelteKit redirects
    if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
      throw err;
    }

    const errorUrl = new URL(`/auth/sso/oidc/${providerId}/callback`, origin);
    errorUrl.searchParams.set('error', err instanceof Error ? err.message : String(err));
    throw redirect(302, errorUrl.toString());
  }
};
