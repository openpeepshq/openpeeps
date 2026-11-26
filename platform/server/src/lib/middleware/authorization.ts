import type { Middleware, RequestEvent } from '@riddl/core';
import { jwtUtil } from '@openpeepshq/core/jwt';
import { isRevoked } from '@openpeepshq/core/accessTokens';
import {
  hasFullAccessScope,
  oauthRequiredScope,
  scopeMatches,
} from '@openpeepshq/common/lib';
import type { Authorization } from '@openpeepshq/common/types';
import { loadCurrentProfile, loadCurrentAccount } from '../auth';

const emptyAuthData = () => ({ scopes: [] as Authorization['scopes'] });

/**
 * Tokens delegated to an OAuth client are checked for revocation (consent can
 * be withdrawn at any time) and, unless they carry full access, confined to
 * the routes their scopes cover — most routes gate on role capabilities only,
 * so scopes are enforced here rather than per endpoint. A rejected token is
 * treated as absent, so public content stays readable.
 */
const delegationAllows = async (
  event: RequestEvent,
  authorization: Authorization,
  jti: string | undefined,
): Promise<boolean> => {
  if (!authorization.identities.client) return true;
  if (!jti || (await isRevoked(jti))) return false;
  if (hasFullAccessScope(authorization.scopes)) return true;
  const requiredScope = oauthRequiredScope(
    event.request.method,
    event.url.pathname,
  );
  return (
    !!requiredScope &&
    scopeMatches({ scopes: authorization.scopes, requiredScope })
  );
};

/**
 * Reads the `Authorization: Bearer <jwt>` header, verifies the JWT and
 * populates `event.context.{authorization, currentProfile, currentAccount, authData}`.
 */
const pre = async (event: RequestEvent): Promise<RequestEvent> => {
  event.context.authData = emptyAuthData();
  const authHeader = event.request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    const jwt = await jwtUtil();
    const verified = await jwt.verify(token);
    const authorization = verified?.payload as Authorization | undefined;
    if (
      authorization &&
      (await delegationAllows(event, authorization, verified?.payload.jti))
    ) {
      event.context.authorization = authorization;
      event.context.currentProfile = await loadCurrentProfile(authorization);
      event.context.currentAccount = await loadCurrentAccount(authorization);
      event.context.authData = {
        profile: event.context.currentProfile,
        account: event.context.currentAccount,
        service: authorization.identities.service,
        scopes: authorization.scopes,
      };
    }
  }
  return event;
};

const post = async (event: RequestEvent): Promise<RequestEvent> => event;

const middleware: Middleware = { pre, post };

export default middleware;
