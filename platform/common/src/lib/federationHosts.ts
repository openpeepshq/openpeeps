/** Exact host, leftmost-label wildcard (`*.example.com`), or `*` = allow all. */
export const hostMatchesAllowedPattern = (
  host: string,
  pattern: string,
): boolean => {
  const normalizedHost = host.trim().toLowerCase().replace(/\.$/, '');
  const normalizedPattern = pattern.trim().toLowerCase().replace(/\.$/, '');
  if (!normalizedHost || !normalizedPattern) return false;
  // A bare `*` permits every host — intended for demo/test instances only.
  if (normalizedPattern === '*') return true;
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
  allowedHosts.some((pattern) => hostMatchesAllowedPattern(host, pattern));
