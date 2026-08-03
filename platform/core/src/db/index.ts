import { initDb } from './init';
import type { PgDb } from './pg/client';
import { OpenpeepsDatabase } from './types';

export { empty } from './examples';
export * from './explorer';
export { map } from './pg/map';
export { collectionInfos } from './pg/collections';
export type { CollectionInfoKey } from './pg/collections';

export type { PgDb } from './pg/client';
export type { PgFilter, SqlFilter } from './pg/map/queryTypes';
export {
  combine,
  createdAtBetween,
  documentKeyAfter,
  documentKeyBefore,
  edgeFilters,
  eventTimeFilters,
  groupFilters,
  isSqlFilter,
  notificationFilters,
  pgSql,
  postFilters,
  profileFilters,
} from './pg/filters';
export { computedFields, sorts } from './pg/queries';

let dbPromise: Promise<OpenpeepsDatabase>;
export const allpeepDb = () => {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
};

export const database = (): Promise<PgDb> => allpeepDb().then(({ db }) => db);
