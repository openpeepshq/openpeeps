import {
  redirect,
  type RequestEvent,
  type RequestHandler,
} from '@sveltejs/kit';
import { scopeMatches } from '@openpeeps/common/lib';
import { defaultConfig } from '@openpeeps/core/config';
import { verifySignedAccessToken } from '@openpeeps/core/accessTokens';


const verifyDbToken = (token: string): Promise<boolean> =>
  verifySignedAccessToken(token).then((authorization) => scopeMatches({
    scopes: authorization?.scopes,
    requiredScope: {
      scopeLevel: 'admin',
      resource: {
        type: 'db',
        id: '*',
      },
    }
  })).catch(() => false);

const checkCookie = async ({ cookies }: RequestEvent): Promise<boolean> => {
  const token = cookies.get('db-token');
  return !!(token && (await verifyDbToken(token)));
};

const checkQueryParamToken = async ({
  url: { searchParams },
  cookies,
}: RequestEvent): Promise<boolean> => {
  const token = searchParams.get('token');
  if (token && (await verifyDbToken(token))) {
    cookies.set('db-token', token, {
      path: '/_db',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
    return true;
  } else {
    return false;
  }
};

const copyHeaders = (headers: Headers, toCopy: string[]) => {
  const newHeaders = new Headers();
  toCopy.forEach((key) => {
    newHeaders.set(key, headers.get(key) || '');
  });
  return newHeaders;
};

export const fallback: RequestHandler = async (event) => {
  if (!((await checkCookie(event)) || (await checkQueryParamToken(event)))) {
    throw redirect(303, '/admin/db');
  }

  const url = `${defaultConfig.db.url}/_db/${event.params.aardvarkPath}`;

  const { method, body, headers } = event.request;

  const proxiedRequest: RequestInit & { duplex: 'half' } = {
    method,
    body,
    headers,
    redirect: 'manual',
    duplex: 'half',
  };

  const response = await fetch(url, proxiedRequest);

  if (response.status === 301) {
    return redirect(
      response.status,
      response.headers.get('Location') || '/admin/db',
    );
  }

  return new Response(response.body, {
    status: response.status,
    headers: copyHeaders(response.headers, [
      'Content-Type',
      'X-Arango-Async-Id',
      'X-Arango-Queue-Time-Seconds',

      'Cache-Control',
      'Access-Control-Expose-Headers',
      'Connection',
      'Expires',
      'Pragma',
      'Server',
    ]),
  });
};
