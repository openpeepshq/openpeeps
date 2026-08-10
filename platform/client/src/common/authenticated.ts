import { fetchClient, type FetchClient } from '@openpeepshq/fetch-client';
import { apiClientConfig } from './base';

export const authHeaders = (token: string) => {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;
};

export const authenticatedCoreApiClient = (token: string): FetchClient =>
  fetchClient({ ...apiClientConfig, headers: authHeaders(token) ?? {} });

export const handleError = async (r: Response) => {
  if (r.ok) {
    return r;
  } else {
    throw { ...(await r.json()), status: r.status };
  }
};

export const transformResponse = (r: Response) => r.json();

export const handleFetchResult = async (r: Response) => {
  await handleError(r);
  return transformResponse(r);
};
