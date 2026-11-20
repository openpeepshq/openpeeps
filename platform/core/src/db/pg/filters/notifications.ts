import { eq, notInArray, sql } from 'drizzle-orm';
import { notifications } from '../schema/documents';
import { pgSql, type SqlFilter } from './types';

const seenExpr = sql`COALESCE((${notifications.body}->>'seen')::boolean, false)`;
const readExpr = sql`COALESCE((${notifications.body}->>'read')::boolean, false)`;

export const notificationFilters = {
  forProfile: (profileId: string): SqlFilter =>
    pgSql(eq(notifications.profileId, profileId)),

  unseen: (): SqlFilter => pgSql(eq(seenExpr, false)),

  unread: (): SqlFilter => pgSql(eq(readExpr, false)),

  /**
   * `type` lives in the JSONB body (not a column), so this is a raw-SQL
   * filter — the same `pgSql` escape hatch the feed's `excludeTypes` filter
   * uses. Excludes notifications of the given types (e.g. the feed's hidden
   * types, so "mark all as seen" only covers what is visible). Like
   * `postFilters.notCreatorIn`, an empty list is a no-op filter.
   */
  typesNotIn: (types: string[]): SqlFilter | undefined =>
    types.length
      ? pgSql(notInArray(sql`${notifications.body} ->> 'type'`, types))
      : undefined,
};
