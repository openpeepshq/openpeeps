import { describe, expect, it } from 'vitest';
import type { PgDb } from './pg/client';
import type { PgQueryResult } from './pg/map';
import { filterAndTransform } from './helpers';

type Doc = { id: number };

/**
 * Stands in for a mapping query result: records the limits it was asked for so
 * tests can assert how many base rows a page reads.
 */
const fakeQueryResult = (total: number) => {
  const requested: (number | [number, number])[] = [];
  const queryResult = {
    limit(limit: number | [number, number]) {
      requested.push(limit);
      return {
        all: async (): Promise<Doc[]> => {
          const [offset, count] = Array.isArray(limit) ? limit : [0, limit];
          return Array.from({ length: total }, (_, index) => ({
            id: index,
          })).slice(offset, offset + count);
        },
      };
    },
  } as unknown as PgQueryResult<Doc>;
  return { queryResult, requested };
};

const db = {} as PgDb;

describe('filterAndTransform', () => {
  it('reads only what the page needs when nothing is filtered out', async () => {
    const { queryResult, requested } = fakeQueryResult(100);

    const result = await filterAndTransform(queryResult, db, { limit: 20 });

    expect(result).toHaveLength(20);
    expect(requested).toEqual([20]);
  });

  it('over-fetches on later pages to refill a filtered page', async () => {
    const { queryResult, requested } = fakeQueryResult(100);

    const result = await filterAndTransform(queryResult, db, {
      limit: 10,
      filter: (doc) => doc.id % 2 === 0,
    });

    expect(result).toHaveLength(10);
    expect(requested.length).toBeGreaterThan(1);
    expect(requested[0]).toBe(10);
  });

  it('stops scanning instead of walking the whole collection', async () => {
    const { queryResult, requested } = fakeQueryResult(10_000);

    const result = await filterAndTransform(queryResult, db, {
      limit: 20,
      filter: () => false,
    });

    expect(result).toEqual([]);
    const scanned = requested.reduce<number>(
      (total, limit) => total + (Array.isArray(limit) ? limit[1] : limit),
      0,
    );
    expect(scanned).toBe(200);
  });
});
