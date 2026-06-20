import { sql } from 'drizzle-orm';
import type { Limit, MapData, SearchDefinition } from './queryTypes';
import type { PgDb } from '../client';
import type { PgQueryResult } from './types';
import { applyLimit, applyPostFilters, applySort } from './filters';
import { hydrateMapData } from './relations';
import {
  asTable,
  getTableForCollection,
  rowToDocument,
  searchViewCollections,
} from './registry';

type SearchHit<O> = { data: O; score: number };

const fieldToSql = (collection: string, field: string) => {
  const scalarFields: Record<string, Record<string, string>> = {
    profiles: { handle: 'handle' },
    groups: { handle: 'handle' },
    posts: { type: 'type', visibility: 'visibility' },
  };

  const scalars = scalarFields[collection];
  const top = field.split('.')[0];
  if (scalars?.[top]) {
    return sql.raw(`"${scalars[top]}"`);
  }
  const jsonPath = field
    .split('.')
    .map((s, i) => (i === 0 ? s : `'${s}'`))
    .join('->');
  return sql.raw(`body->${jsonPath}`);
};

const buildSearchWhere = (
  collection: string,
  fields: string[],
  query: string,
) => {
  const tableRef = getTableForCollection(collection);
  const table = asTable(tableRef);
  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  const tsvectorExpr = sql`to_tsvector('english', coalesce(${table.body}::text, ''))`;
  const ilikeParts = fields.map(
    (field) => sql`${fieldToSql(collection, field)} ILIKE ${'%' + query + '%'}`,
  );

  return sql`(${tsvectorExpr} @@ ${tsQuery} OR ${sql.join(ilikeParts, sql` OR `)})`;
};

export const buildSearchResult = <O extends object>(
  mapData: MapData<O>,
  searchDefinition: SearchDefinition,
): PgQueryResult<{ data: O; score: number }> => {
  const collection =
    searchViewCollections[searchDefinition.view] ?? mapData.collection;

  const runSearch = async (db: PgDb): Promise<SearchHit<O>[]> => {
    const tableRef = getTableForCollection(collection);
    const table = asTable(tableRef);
    const where = buildSearchWhere(
      collection,
      searchDefinition.fields,
      searchDefinition.query,
    );
    const tsQuery = sql`plainto_tsquery('english', ${searchDefinition.query})`;
    const rank = sql<number>`ts_rank(to_tsvector('english', coalesce(${table.body}::text, '')), ${tsQuery})`;

    const rows = await db
      .select({
        row: tableRef as never,
        score: rank,
      })
      .from(tableRef as never)
      .where(where)
      .orderBy(sql`${rank} DESC`);

    let docs: SearchHit<O>[] = rows.map(({ row, score }) => ({
      data: rowToDocument(collection, row as Record<string, unknown>) as O,
      score: score ?? 0,
    }));

    if (collection === mapData.collection) {
      docs = await Promise.all(
        docs.map(async ({ data, score }) => ({
          data: (
            await hydrateMapData(db, mapData, [data as Record<string, unknown>])
          )[0] as O,
          score,
        })),
      );
      const filtered = applyPostFilters(
        docs.map((d) => d.data as Record<string, unknown>),
        mapData.filters as never,
        mapData.defaultFilter as never,
      );
      docs = filtered.map((data, i) => ({
        data: data as unknown as O,
        score: docs[i]?.score ?? 0,
      }));
    }

    docs = applySort(
      docs,
      mapData.sort as [string, 'ASC' | 'DESC' | undefined][] | undefined,
    );
    return applyLimit(docs, searchDefinition.limit ?? mapData.limit);
  };

  return {
    all: (db: PgDb) => runSearch(db),
    count: (db: PgDb) => runSearch(db).then((rows) => rows.length),
    first: (db: PgDb) => runSearch(db).then((rows) => rows[0]),
    limit: (limit: Limit) =>
      buildSearchResult(
        { ...mapData, limit: limit as never },
        searchDefinition,
      ),
    query: () => {
      throw new Error('query() is not supported for Postgres fulltextSearch');
    },
    cursor: async function* (db: PgDb) {
      for (const row of await runSearch(db)) {
        yield row;
      }
    },
  };
};
