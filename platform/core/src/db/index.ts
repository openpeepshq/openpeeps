import { Database } from 'arangojs';
import { initDb } from './init';
import { OpenpeepsDatabase } from './types';

export { empty } from './examples';
export * from './structure';

export * from './arango'

let dbPromise: Promise<OpenpeepsDatabase>;
export const allpeepDb = () => {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
};

export const database = (): Promise<Database> => dbPromise.then(({ db }) => db);