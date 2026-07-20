import { eq, sql } from 'drizzle-orm';
import { notifications } from '../schema/documents';
import { pgSql, type SqlFilter } from './types';

const seenExpr = sql`COALESCE((${notifications.body}->>'seen')::boolean, false)`;
const readExpr = sql`COALESCE((${notifications.body}->>'read')::boolean, false)`;

export const notificationFilters = {
  forProfile: (profileId: string): SqlFilter =>
    pgSql(eq(notifications.profileId, profileId)),

  unseen: (): SqlFilter => pgSql(eq(seenExpr, false)),

  unread: (): SqlFilter => pgSql(eq(readExpr, false)),
};
