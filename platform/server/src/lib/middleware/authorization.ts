import type { Middleware, RequestEvent } from '@riddl/core';
import { jwtUtil } from '@openpeeps/core/jwt';
import type { Authorization } from '@openpeeps/common/types';
import { loadCurrentProfile, loadCurrentAccount } from '../auth';

const emptyAuthData = () => ({ scopes: [] as Authorization['scopes'] });

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
    if (authorization) {
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
