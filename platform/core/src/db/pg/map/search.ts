import { and, sql } from 'drizzle-orm';
import type { Limit, MapData, SearchDefinition } from './queryTypes';
import type { PgDb } from '../client';
import type { PgQueryResult } from './types';
import {
  applyLimit,
  applyPostFilters,
  applySort,
  applySqlLimit,
  partitionFilters,
} from './filters';
import { hydrateMapData } from './relations';
import {
  asTable,
  getTableForCollection,
  rowToDocument,
  searchViewCollections,
} from './registry';

type SearchHit<O> = { data: O; score: number };

const escapeJsonKey = (key: string) => key.replace(/'/g, "''");

const normalizeSearchPath = (collection: string, field: string) => {
  let path = field;
  if (collection === 'posts' && path.startsWith('data.')) {
    path = path.slice(5);
  }
  return path;
};

const jsonBodyTextExpr = (path: string) => {
  const parts = path.split('.');
  if (parts.length === 1) {
    return sql.raw(`body->>'${escapeJsonKey(parts[0]!)}'`);
  }
  const parents = parts
    .slice(0, -1)
    .map((part) => `'${escapeJsonKey(part)}'`)
    .join('->');
  const last = escapeJsonKey(parts[parts.length - 1]!);
  return sql.raw(`body->${parents}->>'${last}'`);
};

const fieldToSql = (collection: string, field: string) => {
  const scalarFields: Record<string, Record<string, string>> = {
    profiles: { handle: 'handle' },
    groups: { handle: 'handle' },
    posts: { type: 'type', visibility: 'visibility' },
  };

  const scalars = scalarFields[collection];
  const path = normalizeSearchPath(collection, field);
  const top = path.split('.')[0];
  if (scalars?.[top]) {
    return sql.raw(`"${scalars[top]}"`);
  }

  return jsonBodyTextExpr(path);
};

const fieldMatchesQuery = (
  collection: string,
  field: string,
  query: string,
  mode: 'substring' | 'prefix' = 'substring',
) => {
  const like = mode === 'prefix' ? `${query}%` : `%${query}%`;
  const scalarFields: Record<string, Record<string, string>> = {
    profiles: { handle: 'handle' },
    groups: { handle: 'handle' },
    posts: { type: 'type', visibility: 'visibility' },
  };
  const path = normalizeSearchPath(collection, field);
  const top = path.split('.')[0];
  if (scalarFields[collection]?.[top]) {
    return sql`${fieldToSql(collection, field)} ILIKE ${like}`;
  }

  const parts = path.split('.');
  if (parts[0] === 'attachments' && parts.length === 2) {
    return sql`EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(body->'attachments', '[]'::jsonb)) AS elem WHERE elem->>${parts[1]!} ILIKE ${like})`;
  }
  if (parts[0] === 'options' && parts.length === 2) {
    return sql`EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(body->'options', '[]'::jsonb)) AS elem WHERE elem->>${parts[1]!} ILIKE ${like})`;
  }

  return sql`${jsonBodyTextExpr(path)} ILIKE ${like}`;
};

const searchableCollections = new Set(['profiles', 'groups', 'posts']);

const searchVectorExpr = (table: Record<string, unknown>) => {
  if (table.searchVector) {
    return sql`${table.searchVector}`;
  }
  return sql`to_tsvector('english', coalesce(${table.body}::text, ''))`;
};

const shortQueryPrefixFields = (collection: string, fields: string[]) => {
  const allowed = new Set(
    collection === 'profiles' || collection === 'groups'
      ? ['handle', 'displayName']
      : ['handle', 'displayName', 'data.name'],
  );
  return fields.filter((field) => {
    const path = normalizeSearchPath(collection, field);
    return allowed.has(path) || allowed.has(field);
  });
};

const buildSearchWhere = (
  collection: string,
  fields: string[],
  query: string,
  table: Record<string, unknown>,
) => {
  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  const tsvectorExpr = searchVectorExpr(table);
  const trimmed = query.trim();
  const shortQuery = trimmed.length > 0 && trimmed.length < 2;
  const ilikeFields = shortQuery
    ? shortQueryPrefixFields(collection, fields)
    : fields;
  const ilikeParts = ilikeFields.map((field) =>
    fieldMatchesQuery(
      collection,
      field,
      trimmed,
      shortQuery ? 'prefix' : 'substring',
    ),
  );

  if (!ilikeParts.length) {
    return sql`(${tsvectorExpr} @@ ${tsQuery})`;
  }

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
    const { sqlWhere, postFilters } =
      collection === mapData.collection
        ? partitionFilters(
            mapData.collection,
            tableRef,
            mapData.filters as never,
            mapData.defaultFilter as never,
            mapData.softDelete,
          )
        : { sqlWhere: undefined, postFilters: [] as never[] };
    const searchWhere = buildSearchWhere(
      collection,
      searchDefinition.fields,
      searchDefinition.query,
      table,
    );
    const where = sqlWhere ? and(searchWhere, sqlWhere) : searchWhere;
    const tsQuery = sql`plainto_tsquery('english', ${searchDefinition.query})`;
    const rank = searchableCollections.has(collection)
      ? sql<number>`ts_rank(${searchVectorExpr(table)}, ${tsQuery})`
      : sql<number>`ts_rank(to_tsvector('english', coalesce(${table.body}::text, '')), ${tsQuery})`;

    const pageLimit = searchDefinition.limit ?? mapData.limit;
    // When post-filters must run in JS, fetch the full match set; otherwise
    // page in SQL so we only hydrate the requested window.
    let selectQuery = db
      .select({
        row: tableRef as never,
        score: rank,
      })
      .from(tableRef as never)
      .where(where)
      .orderBy(sql`${rank} DESC`)
      .$dynamic();
    if (!postFilters.length) {
      selectQuery = applySqlLimit(selectQuery, pageLimit);
    }

    const rows = await selectQuery;

    let docs: SearchHit<O>[] = rows.map(({ row, score }) => ({
      data: rowToDocument(collection, row as Record<string, unknown>) as O,
      score: score ?? 0,
    }));

    if (collection === mapData.collection && docs.length) {
      const hydrated = await hydrateMapData(
        db,
        mapData,
        docs.map((d) => d.data as Record<string, unknown>),
        postFilters,
      );
      docs = hydrated.map((data, i) => ({
        data: data as O,
        score: docs[i]?.score ?? 0,
      }));

      if (postFilters.length) {
        const kept = new Set(
          applyPostFilters(
            docs.map((d) => d.data as Record<string, unknown>),
            postFilters,
          ),
        );
        docs = docs.filter((d) => kept.has(d.data as Record<string, unknown>));
      }
    }

    docs = applySort(
      docs,
      mapData.sort as [string, 'ASC' | 'DESC' | undefined][] | undefined,
    );
    return applyLimit(docs, pageLimit);
  };

  const runCount = async (db: PgDb): Promise<number> => {
    const tableRef = getTableForCollection(collection);
    const { sqlWhere, postFilters } =
      collection === mapData.collection
        ? partitionFilters(
            mapData.collection,
            tableRef,
            mapData.filters as never,
            mapData.defaultFilter as never,
            mapData.softDelete,
          )
        : { sqlWhere: undefined, postFilters: [] as never[] };

    if (!postFilters.length) {
      const searchWhere = buildSearchWhere(
        collection,
        searchDefinition.fields,
        searchDefinition.query,
        asTable(tableRef),
      );
      const where = sqlWhere ? and(searchWhere, sqlWhere) : searchWhere;
      const rows = (await db
        .select({ value: sql<number>`count(*)::int` })
        .from(tableRef as never)
        .where(where)) as { value: number | null }[];
      return Number(rows[0]?.value ?? 0);
    }

    return runSearch(db).then((rows) => rows.length);
  };

  return {
    all: (db: PgDb) => runSearch(db),
    count: (db: PgDb) => runCount(db),
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
