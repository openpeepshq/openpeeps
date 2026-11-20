/**
 * `?redirect=` is user-controlled input used as a navigation target — an
 * absolute URL, protocol-relative host or custom scheme would escape the SPA
 * (the AuthLayout fallback hands targets to `window.location.assign`), so only
 * same-origin relative paths are honored.
 */
export const sanitizeRedirect = (raw: string): string | null => {
  // Search-only values (`?next=/feed`) are rejected here: they do not start
  // with `/`, so the leading-path guard below is what discards them — the
  // URL parse never needs to catch a search-only case.
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  try {
    const url = new URL(raw, 'https://openpeeps.internal');
    if (url.origin !== 'https://openpeeps.internal') return null;
  } catch {
    // Unparseable input (e.g. a leading `/\?`) — the parse is the only
    // remaining rejection path.
    return null;
  }
  return raw;
};
