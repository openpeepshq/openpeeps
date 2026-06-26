import { initDb } from './init';
import type { PgDb } from './pg/client';
import { OpenpeepsDatabase } from './types';

export { empty } from './examples';
export { collectionInfos } from './pg/collections';
export type { CollectionInfoKey } from './pg/collections';

export type { PgDb } from './pg/client';

let dbPromise: Promise<OpenpeepsDatabase>;
export const allpeepDb = () => {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
};

export const database = (): Promise<PgDb> => allpeepDb().then(({ db }) => db);
