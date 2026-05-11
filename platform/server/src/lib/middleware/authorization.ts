import type { Middleware, RequestEvent } from '@riddl/core';
import { jwtUtil } from '@openpeeps/core/jwt';
import type { Authorization } from '@openpeeps/common/types';
import { loadCurrentProfile, loadCurrentAccount } from '../auth';

/**
 * Reads the `Authorization: Bearer <jwt>` header, verifies the JWT and
 * populates `event.context.{authorization, currentProfile, currentAccount}`.
 *
 * Mirrors the SvelteKit `handleAuthorization` hook from `platform/app`.
 */
const pre = async (event: RequestEvent): Promise<RequestEvent> => {
  const authHeader = event.request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    const jwt = await jwtUtil();
    const authorization = (await jwt.verify(token))?.payload as Authorization;
    if (authorization) {
      event.context.authorization = authorization;
      event.context.currentProfile = await loadCurrentProfile(authorization);
      event.context.currentAccount = await loadCurrentAccount(authorization);
    }
  }
  return event;
};

const post = async (event: RequestEvent): Promise<RequestEvent> => event;

const middleware: Middleware = { pre, post };

export default middleware;
