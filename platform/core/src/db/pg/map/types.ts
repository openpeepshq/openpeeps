import type { Limit } from './queryTypes';
import type { PgDb } from '../client';

export type { Limit } from './queryTypes';

export type PgQueryResult<T extends object> = {
  all: (db: PgDb) => Promise<T[]>;
  count: (db: PgDb) => Promise<number>;
  first: (db: PgDb) => Promise<T | undefined>;
  limit: (limit: Limit) => PgQueryResult<T>;
  query: () => never;
  cursor: (db: PgDb) => AsyncGenerator<T>;
};
