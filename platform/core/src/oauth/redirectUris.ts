const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]', 'localhost']);

// RFC 8252 §7.1: private-use schemes must be reverse-domain names, which
// also rules out `javascript:`, `data:` and other dotless schemes.
const PRIVATE_USE_SCHEME = /^[a-z][a-z0-9+-]*(\.[a-z0-9+-]+)+:$/;

const parse = (uri: string): URL | undefined => {
  try {
    return new URL(uri);
  } catch {
    return undefined;
  }
};

const isLoopback = (url: URL) =>
  url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);

/** https, loopback http (RFC 8252 §7.3) or a private-use scheme; no fragment. */
export const isAllowedRedirectUri = (uri: string): boolean => {
  const url = parse(uri);
  if (!url || uri.includes('#')) return false;
  return (
    url.protocol === 'https:' ||
    isLoopback(url) ||
    PRIVATE_USE_SCHEME.test(url.protocol)
  );
};

const withoutPort = (url: URL) =>
  `${url.protocol}//${url.hostname}${url.pathname}${url.search}`;

/**
 * Exact string match against the registered URIs, except that loopback
 * redirects may use any port (RFC 8252 §7.3: native apps bind ephemeral ports).
 */
export const redirectUriMatches = (
  registered: string[],
  uri: string,
): boolean => {
  if (registered.includes(uri)) return true;
  const url = parse(uri);
  if (!url || !isLoopback(url)) return false;
  return registered.some((candidate) => {
    const registeredUrl = parse(candidate);
    return (
      !!registeredUrl &&
      isLoopback(registeredUrl) &&
      withoutPort(registeredUrl) === withoutPort(url)
    );
  });
};
