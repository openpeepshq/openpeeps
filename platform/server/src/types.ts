import type {
  AccountWithMeta,
  Authorization,
  ProfileWithMeta,
} from '@openpeeps/common/types';

/**
 * Per-request context exposed to endpoint handlers via `event.context`.
 *
 * Populated by the authorization middleware. Mirrors the `event.locals` shape
 * from the SvelteKit version of the API (`platform/app`).
 */
declare global {
  namespace Riddl {
    interface RequestContext {
      authorization?: Authorization;
      currentProfile?: ProfileWithMeta;
      currentAccount?: AccountWithMeta;
    }
  }
}

export {};
