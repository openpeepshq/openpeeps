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

export const pgSql = (where: SQL): SqlFilter => ({ kind: 'sql', where });
