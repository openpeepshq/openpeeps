import { eq, sql } from 'drizzle-orm';
import { entries, userGroups } from '../schema/edges';
import { createdAtBetween } from './common';
import { pgSql, type SqlFilter } from './types';

export const edgeFilters = {
  entryType: (type: string): SqlFilter =>
    pgSql(eq(sql`${entries.body}->>'type'`, type)),

  entryCreated: (start?: Date, end?: Date): SqlFilter | undefined =>
    createdAtBetween(entries, start, end),

  bodyFieldEq: (
    table: { body: unknown },
    field: string,
    value: string,
  ): SqlFilter => pgSql(eq(sql`${table.body}->>${field}`, value)),

  groupAdminRole: (): SqlFilter =>
    pgSql(sql`${userGroups.body}->'roles' ? 'admin'`),
};
