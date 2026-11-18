/**
 * Push-subscription response helpers shared by the web and native logout
 * paths. Dependency-free on purpose: the RN package imports this source file
 * directly (built `@openpeepshq/react` ships ESM, which RN Jest cannot load),
 * so anything imported here must stay resolvable under a bare ts-jest setup.
 */

export const handleResult = <T>(r: { data: T } | { error: unknown }): T => {
  if ('data' in r) return r.data;
  throw r.error;
};

/**
 * The API reports a missing subscription row with 404; 410 is tolerated
 * alongside it (a gone endpoint is equally "already deleted"). Both statuses
 * mean "nothing left to delete", every other status is a real failure.
 *
 * Accepted shapes are pinned deliberately: only the `{ __HTTP_ERROR__: true, status }`
 * object itself, or wrapped one level in the typed client's `{ error: … }`
 * envelope, is unwrapped and checked. Errors whose *nested* payload matches
 * (e.g. `{ error: { error: { __HTTP_ERROR__: true, … } } }` from a wrapped
 * client response) are intentionally NOT matched — a refactor must not widen
 * this silently.
 */
export const isSubscriptionNotFound = (err: unknown): boolean => {
  const candidate = (err as { error?: unknown } | undefined)?.error ?? err;
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    '__HTTP_ERROR__' in candidate &&
    (candidate as { __HTTP_ERROR__?: unknown }).__HTTP_ERROR__ === true
  ) {
    const status = (candidate as { status?: unknown }).status;
    return status === 404 || status === 410;
  }
  return false;
};
