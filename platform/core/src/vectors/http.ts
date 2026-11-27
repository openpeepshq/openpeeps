import { fetchClient } from '@openpeepshq/fetch-client';

export type HttpProvider = {
  endpoint: string;
  credential: string;
  model: string;
};

export const isHttpUrl = (endpoint: string) => {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const providerReady = (provider: HttpProvider) =>
  isHttpUrl(provider.endpoint) &&
  provider.credential.trim().length > 0 &&
  provider.model.trim().length > 0;

export const providerClient = (provider: HttpProvider) =>
  fetchClient({
    baseUrl: provider.endpoint.replace(/\/+$/, ''),
    headers: {
      Authorization: `Bearer ${provider.credential}`,
    },
  });

export const readError = async (response: Response) => {
  const body = await response.text();
  return body.slice(0, 300);
};

/** 401/403 mean the credential was rejected. Other 4xx still prove reachability. */
export const responseReachable = (status: number) =>
  status !== 401 && status !== 403 && status < 500;

/**
 * Providers are third-party: a hung endpoint must not stall server/worker
 * boot (the probe awaits at startup) or a job worker forever.
 */
export const PROVIDER_TIMEOUT_MS = 30_000;

/** Audio uploads are long-running by nature, so they get a wider bound. */
export const PROVIDER_UPLOAD_TIMEOUT_MS = 5 * 60_000;

export const providerSignal = (timeoutMs = PROVIDER_TIMEOUT_MS) =>
  AbortSignal.timeout(timeoutMs);
