import { endpoint, z } from '#lib/endpoint';
import { serverRootUrl } from '@openpeepshq/core/server';
import { notFound } from '#lib/errors';
import { callback as oauth2Callback } from '#lib/handlers/sso/oauth2';

export const Param = z.object({ id: z.string() });

export const Error = {
  404: notFound(),
};

const redirect = (location: string): Response =>
  new Response(null, { status: 302, headers: { Location: location } });

// The provider redirects the browser here. We exchange the code, then hand
// the resulting token (or error) to the SPA's callback route, which stores
// credentials and navigates into the app.
export const apiEndpoint = endpoint({ Param, Error }).handle(
  async (input: { id: string }, event) => {
    const providerId = input.id;
    const queryParams = Object.fromEntries(event.url.searchParams.entries());
    const origin = await serverRootUrl();
    const callbackUrl = new URL(
      `/auth/sso/gitlab/${providerId}/callback`,
      origin,
    );

    try {
      const result = await oauth2Callback('gitlab', providerId, queryParams);

      if (result.success && result.token) {
        callbackUrl.searchParams.set('token', result.token);
        return redirect(callbackUrl.toString());
      }

      if (result.redirectUrl) {
        return redirect(result.redirectUrl);
      }

      callbackUrl.searchParams.set(
        'error',
        result.error || 'Authentication failed',
      );
      return redirect(callbackUrl.toString());
    } catch (err) {
      callbackUrl.searchParams.set(
        'error',
        err instanceof globalThis.Error ? err.message : String(err),
      );
      return redirect(callbackUrl.toString());
    }
  },
);
