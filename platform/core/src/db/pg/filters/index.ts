import { and, type SQL } from 'drizzle-orm';
import type { OMFilter, PgFilter } from '../map/queryTypes';
import { isSqlFilter, pgSql, type SqlFilter } from './types';

export {
  createdAtBetween,
  afterId,
  beforeId,
  documentKeyAfter,
  documentKeyBefore,
  notDeleted,
} from './common';
export { edgeFilters } from './edges';
export { eventTimeFilters, postFilters } from './posts';
export { groupFilters } from './groups';
export { notificationFilters } from './notifications';
export { profileFilters } from './profiles';
export { isSqlFilter, pgSql };
export type { SqlFilter };
export type { PgFilter } from '../map/queryTypes';

export const combine = {
  and: <O extends object>(...filters: PgFilter<O>[]): PgFilter<O> => ({
    operator: '&&',
    predicates: filters,
  }),

  or: <O extends object>(...filters: PgFilter<O>[]): PgFilter<O> => ({
    operator: '||',
    predicates: filters,
  }),
};

export const sqlConditions = (...filters: SqlFilter[]): SQL | undefined => {
  const parts = filters.map((filter) => filter.where);
  return parts.length ? and(...parts) : undefined;
};

export const partitionPgFilters = <O extends object>(
  filters: PgFilter<O>[] | undefined,
): {
  sqlFilters: SqlFilter[];
  omFilters: OMFilter<O>[];
} => {
  const sqlFilters: SqlFilter[] = [];
  const omFilters: OMFilter<O>[] = [];
  for (const filter of filters ?? []) {
    if (isSqlFilter(filter)) sqlFilters.push(filter);
    else omFilters.push(filter);
  }
  return { sqlFilters, omFilters };
};

export const wrapSql = pgSql;
