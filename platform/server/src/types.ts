import type {
  AccountWithMeta,
  Authorization,
  AuthorizationData,
  ProfileWithMeta,
} from '@openpeepshq/common/types';

/**
 * Per-request context exposed to endpoint handlers via `event.context`.
 * Populated by the authorization middleware.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Riddl {
    interface RequestContext {
      authorization?: Authorization;
      currentProfile?: ProfileWithMeta;
      currentAccount?: AccountWithMeta;
      authData: AuthorizationData;
    }
  }
}

export {};
