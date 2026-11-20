import type { SQL } from 'drizzle-orm';

export type SqlFilter = {
  kind: 'sql';
  where: SQL;
};

export const isSqlFilter = (filter: unknown): filter is SqlFilter =>
  typeof filter === 'object' &&
  filter !== null &&
  'kind' in filter &&
  (filter as SqlFilter).kind === 'sql';

/**
 * Raw-SQL filter escape hatch. Use only when the predicate cannot be
 * expressed as a column filter — e.g. over a JSONB-resident field like
 * `body ->> 'type'`. Pass a drizzle `SQL` fragment with values bound through
 * the `sql` template tag (parameterized, never string-interpolated).
 */
export const pgSql = (where: SQL): SqlFilter => ({ kind: 'sql', where });
