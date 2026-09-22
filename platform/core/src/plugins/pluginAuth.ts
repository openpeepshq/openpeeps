import type { NextFunction, Request, Response } from 'express';
import type { JWTPayload } from 'jose';

import { jwtUtil } from '../jwt';

type PluginProfile = { id: string };

type AuthorizationPayload = JWTPayload & {
  identities?: { profile?: string; service?: string };
};

declare global {
  namespace Express {
    interface Request {
      pluginProfile?: PluginProfile;
    }
  }
}

/**
 * Express middleware that verifies the `Authorization: Bearer <token>` header
 * and attaches `{ pluginProfile }` to the request if valid.
 *
 * Use in plugin routes:
 * ```ts
 * router.get('/secure', ensurePluginAuth(), handler);
 * ```
 *
 * If no valid token is present, the middleware returns 401 JSON. Plugin authors
 * can use `req.pluginProfile` to identify the caller.
 *
 * Note: this helper validates the JWT signature and the presence of a profile
 * identity only. It does not expose the profile handle, check token revocation,
 * or verify whether the profile/account still exists. Plugin authors that need
 * stronger guarantees or the handle should perform their own lookup.
 */
export const ensurePluginAuth =
  () => async (req: Request, res: Response, next: NextFunction) => {
    // Express 5's RequestHandler type requires `void | Promise<void>` — never
    // `return res...`, which types as `Promise<Response>` and fails overload
    // resolution wherever this middleware is passed to router.post/get/etc.
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const token = authHeader.slice(7);
    if (!token) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    try {
      const jwt = await jwtUtil();
      const verified = await jwt.verify(token);
      const payload = verified?.payload as AuthorizationPayload | undefined;
      if (!payload?.identities?.profile) {
        res.status(401).json({ success: false, message: 'Invalid token' });
        return;
      }
      req.pluginProfile = { id: payload.identities.profile };
      next();
    } catch {
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  };
