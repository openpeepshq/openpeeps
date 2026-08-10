import type { Express, Response } from 'express';

/**
 * Legacy ArangoDB Aardvark proxy removed after Postgres cutover.
 * Admins inspect data with Drizzle Studio (`pnpm --filter @openpeepshq/core db:studio`)
 * or `psql` using `DATABASE_URL`.
 */
export const installDbBrowserProxy = (app: Express) => {
  app.use('/_db', (_req, res: Response) => {
    res.redirect(303, '/admin/db');
  });
};
