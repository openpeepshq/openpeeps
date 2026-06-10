import { endpoint, z } from '#lib/endpoint';
import { serverRootUrl } from '@openpeeps/core/server';
import { notFound } from '#lib/errors';
import { authorize } from '#lib/handlers/sso/oidc';

export const Param = z.object({ id: z.string() });

export const Error = {
  404: notFound(),
};

// Browser-facing top-level navigation: the login page links here with an
// anchor, so we issue a real 302 redirect to the provider rather than JSON.
export const apiEndpoint = endpoint({ Param, Error }).handle(
  async (input: { id: string }, event) => {
    const params = Object.fromEntries(event.url.searchParams.entries());
    try {
      const authUrl = await authorize(input.id, params);
      return new Response(null, {
        status: 302,
        headers: { Location: authUrl.toString() },
      });
    } catch (err) {
      const origin = await serverRootUrl();
      const errorUrl = new URL(
        `/auth/sso/oidc/${input.id}/callback`,
        origin,
      );
      errorUrl.searchParams.set(
        'error',
        err instanceof globalThis.Error ? err.message : String(err),
      );
      return new Response(null, {
        status: 302,
        headers: { Location: errorUrl.toString() },
      });
    }
  },
);
