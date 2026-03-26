import type { Handle } from '@sveltejs/kit';
import {
  loadCurrentProfile,
  loadCurrentAccount,
} from '$lib/server/auth';
import { jwtUtil } from '@openpeeps/core/jwt';
import type { Authorization } from '@openpeeps/common/types';

export const handleAuthorization: Handle = async ({ event, resolve }) => {
  const authHeader = event.request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    const jwt = await jwtUtil();
    const authorization = (await jwt.verify(token))?.payload as Authorization;
    if (authorization) {
      event.locals.authorization = authorization;
      event.locals.currentProfile = await loadCurrentProfile(authorization);
      event.locals.currentAccount = await loadCurrentAccount(authorization);
    }
  }
  return resolve(event);
};
