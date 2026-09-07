import type { NextFunction, Request, Response } from 'express';

import { findAccount } from '../accounts';
import { verifySignedAccessToken } from '../accessTokens';
import { findProfile } from '../profiles';
import { checkSubscription } from '../stripe';

type PluginProfile = { id: string };

declare global {
  // Express request augmentation requires TypeScript declaration merging.
  // eslint-disable-next-line @typescript-eslint/no-namespace
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
 * Invalid or revoked tokens return 401. The current local profile/account and
 * subscription are revalidated before plugin code receives the profile ID.
 */
export const ensurePluginAuth =
  () => async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.slice(7);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let payload;
    try {
      payload = await verifySignedAccessToken(token);
    } catch {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const profileId = payload?.identities?.profile;
    if (!payload || !profileId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    try {
      const [profile, account] = await Promise.all([
        findProfile(profileId),
        payload.identities.account
          ? findAccount(payload.identities.account)
          : Promise.resolve(undefined),
      ]);
      if (payload.identities.account && (!account || account.deletedAt)) {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid account' });
      }
      if (!profile || profile.deletedAt || profile.type !== 'local') {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid profile' });
      }
      if (!(await checkSubscription(profile, account))) {
        return res
          .status(403)
          .json({ success: false, message: 'Subscription needed' });
      }
      req.pluginProfile = { id: profile.id };
      next();
    } catch (error) {
      next(error);
    }
  };
