import { BASE_URL } from './constants';

export const toAbsoluteMediaUrl = (
  url?: string,
): string | undefined => {
  if (!url) {
    return undefined;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/') && BASE_URL?.trim()) {
    return `${BASE_URL.replace(/\/$/, '')}${url}`;
  }
  return url;
};

/**
 * Returns the origin (`scheme://host[:port]`) of the configured API server,
 * or `undefined` if `BASE_URL` is not set / unparseable.
 *
 * Used by HLS playback: the streaming endpoints sit at the application root
 * (`/media/streaming/...`), not under the API subtree, so we need the bare
 * origin to construct playlist URLs.
 */
export const getServerOrigin = (): string | undefined => {
  if (!BASE_URL?.trim()) return undefined;
  try {
    return new URL(BASE_URL).origin;
  } catch {
    return undefined;
  }
};

/**
 * `true` when `url` resolves to the configured API server — i.e. content
 * served by this OpenPeeps instance, eligible for on-server HLS transcoding.
 * Federated content (different origin) is not.
 *
 * Path-relative URLs (`/...`) are always considered local because
 * {@link toAbsoluteMediaUrl} resolves them against `BASE_URL`.
 */
export const isLocalMediaUrl = (url?: string): boolean => {
  if (!url) return false;
  const serverOrigin = getServerOrigin();
  if (!serverOrigin) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    return new URL(url).origin === serverOrigin;
  } catch {
    return false;
  }
};
