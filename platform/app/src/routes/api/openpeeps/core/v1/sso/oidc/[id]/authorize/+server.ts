import type { RequestHandler } from './$types';
import { authorize } from '$lib/server/api/handlers/sso/oidc';

export const GET: RequestHandler = async ({ params, url, cookies }) => {
  const providerId = params.id;
  
  try {
    const authUrl = await authorize(providerId, Object.fromEntries(url.searchParams));
    return new Response(null, {
      status: 302,
      headers: { 'Location': authUrl.toString() }
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: 'OIDC authorization failed', detail: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
