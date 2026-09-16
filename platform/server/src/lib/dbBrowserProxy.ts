import type { Express, Response } from 'express';

/**
 * `/_db` used to proxy a document browser; send admins to the in-app explorer.
 * Inspect tables with Drizzle Studio (`pnpm --filter @openpeepshq/core db:studio`)
 * or `psql` using `DATABASE_URL`.
 */
export const installDbBrowserProxy = (app: Express) => {
  app.use('/_db', (_req, res: Response) => {
    res.redirect(303, '/admin/db');
  });
};
