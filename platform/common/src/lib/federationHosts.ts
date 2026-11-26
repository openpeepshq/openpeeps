/** Leftmost-label wildcard only: `*.example.com` matches `a.example.com`. */
export const hostMatchesHostPattern = (
  host: string,
  pattern: string,
): boolean => {
  const normalizedHost = host.trim().toLowerCase().replace(/\.$/, '');
  const normalizedPattern = pattern.trim().toLowerCase().replace(/\.$/, '');
  if (!normalizedHost || !normalizedPattern) return false;
  if (normalizedPattern === '*') return false;
  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(2);
    if (!suffix.includes('.')) return false;
    return normalizedHost === suffix || normalizedHost.endsWith(`.${suffix}`);
  }
  return normalizedHost === normalizedPattern;
};

export const hostIsAllowed = (
  host: string,
  allowedHosts: readonly string[],
): boolean =>
  allowedHosts.some((pattern) => hostMatchesHostPattern(host, pattern));

export const hostIsBlocked = (
  host: string,
  blockedHosts: readonly string[],
): boolean =>
  blockedHosts.some((pattern) => hostMatchesHostPattern(host, pattern));

/** A host federates only when it matches the allowlist and no blocklist pattern. */
export const hostFederationAllowed = (
  host: string,
  allowedHosts: readonly string[],
  blockedHosts: readonly string[],
): boolean =>
  hostIsAllowed(host, allowedHosts) && !hostIsBlocked(host, blockedHosts);

/**
 * True when a sparse config patch touches the `federation` subtree (the
 * allow/blocklist). Detects `{ federation: … }` only — an empty or unrelated
 * patch never returns true, so the extra capability gate is applied narrowly.
 */
export const patchTouchesFederation = (config: unknown): boolean =>
  Boolean(
    config &&
      typeof config === 'object' &&
      'federation' in (config as Record<string, unknown>),
  );
