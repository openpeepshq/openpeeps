import { and, eq, inArray, sql } from 'drizzle-orm';
import type {
  DerivedProperty,
  ForeignKeyRelation,
  MapData,
  OMFilter,
  Relation,
} from './queryTypes';
import type { PgDb } from '../client';
import {
  applyDateRangeToEdgeSql,
  applyLimit,
  applyPostFilters,
  applySqlLimit,
  applySort,
  partitionFilters,
  sortToSqlOrderBy,
  getEdgeTable,
} from './filters';
import {
  asTable,
  edgeRegistry,
  getTableForCollection,
  rowToDocument,
} from './registry';

type Doc = Record<string, unknown>;

const vertexCollectionFor = (relation: Relation): string | undefined => {
  const edgeName =
    typeof relation.edgeCollection === 'string'
      ? relation.edgeCollection
      : relation.edgeCollection.name;
  return (
    relation.mapping?.collection ??
    edgeRegistry[edgeName]?.[
      relation.direction === 'INBOUND' ? 'fromCollection' : 'toCollection'
    ]
  );
};

const edgeCollectionName = (edge: Relation['edgeCollection']): string =>
  typeof edge === 'string' ? edge : edge.name;

const parentEdgeColumn = (relation: Relation): 'fromId' | 'toId' =>
  relation.direction === 'INBOUND' ? 'toId' : 'fromId';

const vertexEdgeColumn = (relation: Relation): 'fromId' | 'toId' =>
  relation.direction === 'INBOUND' ? 'fromId' : 'toId';

export const fetchRowsByIds = async (
  db: PgDb,
  collection: string,
  ids: string[],
  softDelete?: boolean,
): Promise<Doc[]> => {
  if (!ids.length) return [];
  const table = asTable(getTableForCollection(collection));
  const conditions = [inArray(table.id as never, ids)];
  if (softDelete !== false && table.deletedAt) {
    conditions.push(sql`${table.deletedAt} IS NULL`);
  }
  const rows = await db
    .select()
    .from(getTableForCollection(collection) as never)
    .where(and(...conditions));
  return rows.map((row) =>
    rowToDocument(collection, row as Record<string, unknown>),
  );
};

const hydrateDocuments = async (
  db: PgDb,
  collection: string,
  mapData: MapData<object, object>,
  rows: Doc[],
  postFilters?: OMFilter<Record<string, unknown>>[],
): Promise<Doc[]> => {
  let docs = rows;
  for (const relation of mapData.relations ?? []) {
    docs = await attachRelation(db, collection, docs, relation);
  }
  for (const fkr of mapData.foreignKeyRelations ?? []) {
    docs = await attachForeignKeyRelation(db, docs, fkr);
  }
  for (const dp of mapData.derivedProperties ?? []) {
    docs = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        [String(dp.alias)]: await evaluateDerived(db, doc, dp),
      })),
    );
  }
  docs = applyPostFilters(
    docs,
    postFilters ?? mapData.filters,
    postFilters ? undefined : mapData.defaultFilter,
  ) as Doc[];
  docs = applySort(docs, mapData.sort);
  for (const relation of mapData.postFilterRelations ?? []) {
    docs = await attachRelation(db, collection, docs, relation);
  }
  for (const fkr of mapData.postFilterForeignKeyRelations ?? []) {
    docs = await attachForeignKeyRelation(db, docs, fkr);
  }
  for (const dp of mapData.postFilterDerivedProperties ?? []) {
    docs = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        [String(dp.alias)]: await evaluateDerived(db, doc, dp),
      })),
    );
  }
  return docs;
};

export const hydrateMapData = async (
  db: PgDb,
  mapData: MapData<object, object>,
  rows: Doc[],
  postFilters?: OMFilter<Record<string, unknown>>[],
): Promise<Doc[]> =>
  hydrateDocuments(db, mapData.collection, mapData, rows, postFilters);

const attachForeignKeyRelation = async (
  db: PgDb,
  docs: Doc[],
  fkr: ForeignKeyRelation,
): Promise<Doc[]> =>
  Promise.all(
    docs.map(async (doc) => {
      const raw = doc[fkr.foreignKeyProperty];
      const ids =
        fkr.cardinality === 'many'
          ? ((raw as string[] | undefined) ?? [])
          : raw
            ? [raw as string]
            : [];
      const loaded = (
        await Promise.all(
          ids.map((id) =>
            executeFind(db, fkr.mapping.collection, fkr.mapping, id),
          ),
        )
      ).filter(Boolean) as Doc[];
      return {
        ...doc,
        [fkr.alias]:
          fkr.cardinality === 'many' ? loaded : (loaded[0] ?? undefined),
      };
    }),
  );

const attachRelation = async (
  db: PgDb,
  parentCollection: string,
  docs: Doc[],
  relation: Relation,
): Promise<Doc[]> => {
  if (relation.maxDepth && relation.maxDepth > 1) {
    return Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        [relation.alias]: await traverseRelation(
          db,
          doc.id as string,
          relation,
        ),
      })),
    );
  }

  const edgeTableRef = getEdgeTable(
    edgeCollectionName(relation.edgeCollection),
  );
  const edgeTable = asTable(edgeTableRef);
  const parentIds = docs.map((d) => d.id as string);
  if (!parentIds.length) return docs;

  const parentCol = edgeTable[parentEdgeColumn(relation)] as never;
  const edgeConditions = [inArray(parentCol, parentIds)];
  const edgeDateFilter =
    typeof relation.edgeFilter === 'string'
      ? applyDateRangeToEdgeSql(edgeTableRef, relation.edgeFilter)
      : undefined;
  if (edgeDateFilter) edgeConditions.push(edgeDateFilter);

  const edgeRows = await db
    .select()
    .from(edgeTableRef as never)
    .where(and(...edgeConditions));

  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const edge of edgeRows) {
    const parentId = (edge as Record<string, unknown>)[
      parentEdgeColumn(relation)
    ] as string;
    const list = grouped.get(parentId) ?? [];
    list.push(edge as Record<string, unknown>);
    grouped.set(parentId, list);
  }

  return Promise.all(
    docs.map(async (doc) => {
      const edgesForDoc = grouped.get(doc.id as string) ?? [];
      if (relation.count) {
        let count = edgesForDoc.length;
        if (relation.mapping?.collection) {
          const vertexCol = vertexEdgeColumn(relation);
          const vertexIds = edgesForDoc.map((e) => e[vertexCol] as string);
          const vertices = await fetchRowsByIds(
            db,
            relation.mapping.collection,
            vertexIds,
            relation.mapping.softDelete,
          );
          const filtered = applyPostFilters(
            vertices,
            relation.mapping.filters,
            relation.mapping.defaultFilter,
          );
          count = filtered.length;
        }
        return { ...doc, [relation.alias]: count };
      }

      const value = await resolveRelationValue(
        db,
        edgesForDoc,
        relation,
        parentCollection,
      );
      return { ...doc, [relation.alias]: value };
    }),
  );
};

const resolveRelationValue = async (
  db: PgDb,
  edgeRows: Record<string, unknown>[],
  relation: Relation,
  _parentCollection: string,
): Promise<unknown> => {
  const vertexCollection = vertexCollectionFor(relation);
  const vertexCol = vertexEdgeColumn(relation);
  const vertexIds = edgeRows.map((e) => e[vertexCol] as string);

  if (!vertexCollection) {
    const items = edgeRows.map((edge) =>
      rowToDocument(
        edgeCollectionName(relation.edgeCollection),
        edge,
        relation.mapping?.keepMetadata,
      ),
    );
    return relation.cardinality === 'one' ? items[0] : items;
  }

  let vertices = await fetchRowsByIds(
    db,
    vertexCollection,
    vertexIds,
    relation.mapping?.softDelete,
  );

  if (relation.mapping) {
    vertices = await hydrateMapData(db, relation.mapping, vertices);
  }

  if (relation.skipEdge) {
    return relation.cardinality === 'one' ? vertices[0] : vertices;
  }

  const items = edgeRows
    .map((edge) => {
      const vertexId = edge[vertexCol] as string;
      const vertex = vertices.find((v) => v.id === vertexId);
      if (!vertex) return undefined;
      const edgeDoc = rowToDocument(
        edgeCollectionName(relation.edgeCollection),
        edge,
        relation.mapping?.keepMetadata,
      );
      if (relation.vertexAlias) {
        return { ...edgeDoc, [relation.vertexAlias]: vertex };
      }
      return { ...edgeDoc, ...vertex };
    })
    .filter(Boolean);

  return relation.cardinality === 'one' ? items[0] : items;
};

const traverseRelation = async (
  db: PgDb,
  startId: string,
  relation: Relation,
): Promise<Doc[]> => {
  const maxDepth = relation.maxDepth ?? 1;
  const edgeTableRef = getEdgeTable(
    edgeCollectionName(relation.edgeCollection),
  );
  const edgeTable = asTable(edgeTableRef);
  const collected: Doc[] = [];
  let frontier = [startId];

  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const parentCol = edgeTable[parentEdgeColumn(relation)] as never;
    const vertexCol = vertexEdgeColumn(relation);
    const edgeRows = await db
      .select()
      .from(edgeTableRef as never)
      .where(inArray(parentCol, frontier));

    if (!edgeRows.length) break;

    const vertexIds = edgeRows.map(
      (e) => (e as Record<string, unknown>)[vertexCol] as string,
    );
    const vertexCollection = vertexCollectionFor(relation);
    if (!vertexCollection) break;

    let vertices = await fetchRowsByIds(
      db,
      vertexCollection,
      vertexIds,
      relation.mapping?.softDelete,
    );
    if (relation.mapping) {
      vertices = await hydrateMapData(db, relation.mapping, vertices);
    }
    collected.push(...vertices);
    frontier = vertexIds;
  }

  return collected;
};

export const executeFind = async (
  db: PgDb,
  collection: string,
  mapData: MapData<object, object>,
  id: string,
  ignoreSoftDelete = false,
): Promise<Doc | undefined> => {
  const table = asTable(getTableForCollection(collection));
  const conditions = [eq(table.id as never, id)];
  if (!ignoreSoftDelete && mapData.softDelete !== false && table.deletedAt) {
    conditions.push(sql`${table.deletedAt} IS NULL`);
  }
  const rows = await db
    .select()
    .from(getTableForCollection(collection) as never)
    .where(and(...conditions))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  const hydrated = await hydrateMapData(db, mapData, [
    rowToDocument(collection, row as Record<string, unknown>),
  ]);
  return hydrated[0];
};

export const executeAll = async (
  db: PgDb,
  mapData: MapData<object, object>,
): Promise<Doc[]> => {
  const table = getTableForCollection(mapData.collection);
  const { sqlWhere, postFilters } = partitionFilters(
    mapData.collection,
    table,
    mapData.filters,
    mapData.defaultFilter,
    mapData.softDelete,
  );
  const orderBy = sortToSqlOrderBy(mapData.collection, table, mapData.sort);
  const canSqlPaginate =
    postFilters.length === 0 && (!mapData.sort?.length || !!orderBy);

  let query = db
    .select()
    .from(table as never)
    .$dynamic();
  if (sqlWhere) query = query.where(sqlWhere);
  if (canSqlPaginate && orderBy) query = query.orderBy(...orderBy);
  if (canSqlPaginate && mapData.limit) {
    query = applySqlLimit(query, mapData.limit);
  }

  const rows = await query;
  let docs = rows.map((row) =>
    rowToDocument(mapData.collection, row as Record<string, unknown>),
  );
  docs = await hydrateMapData(db, mapData, docs, postFilters);

  if (!orderBy) {
    docs = applySort(docs, mapData.sort);
  }
  if (!canSqlPaginate) {
    docs = applyLimit(docs, mapData.limit) as Doc[];
  }
  return docs;
};

export const executeCount = async (
  db: PgDb,
  mapData: MapData<object, object>,
): Promise<number> => {
  const table = getTableForCollection(mapData.collection);
  const { sqlWhere, postFilters } = partitionFilters(
    mapData.collection,
    table,
    mapData.filters,
    mapData.defaultFilter,
    mapData.softDelete,
  );

  if (!postFilters.length) {
    const rows = (await db
      .select({ value: sql<number>`count(*)::int` })
      .from(table as never)
      .where(sqlWhere)) as { value: number | null }[];
    return Number(rows[0]?.value ?? 0);
  }

  const docs = await executeAll(db, { ...mapData, limit: undefined });
  return docs.length;
};

export const executeFirst = async (
  db: PgDb,
  mapData: MapData<object, object>,
): Promise<Doc | undefined> => {
  const limited = applyLimit(await executeAll(db, mapData), [0, 1]);
  return limited[0];
};

export const relationsFrom = async (
  db: PgDb,
  start: { id: string },
  parentCollection: string,
  relation: Relation & { mapping: MapData<object, object> },
): Promise<Doc[]> => {
  const edgeTableRef = getEdgeTable(
    edgeCollectionName(relation.edgeCollection),
  );
  const edgeTable = asTable(edgeTableRef);
  const parentCol = edgeTable[parentEdgeColumn(relation)] as never;
  const edgeRows = await db
    .select()
    .from(edgeTableRef as never)
    .where(eq(parentCol, start.id));

  if (relation.count) {
    return [{ count: edgeRows.length } as unknown as Doc];
  }

  if (relation.skipEdge && relation.mapping.collection) {
    const vertexCol = vertexEdgeColumn(relation);
    const vertexIds = edgeRows.map(
      (e) => (e as Record<string, unknown>)[vertexCol] as string,
    );
    return hydrateMapData(
      db,
      relation.mapping,
      await fetchRowsByIds(
        db,
        relation.mapping.collection,
        vertexIds,
        relation.mapping.softDelete,
      ),
    );
  }

  return edgeRows.map((edge) =>
    rowToDocument(
      edgeCollectionName(relation.edgeCollection),
      edge as Record<string, unknown>,
      relation.mapping.keepMetadata,
    ),
  );
};

const getPath = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.replace(/\[['"]?(\w+)['"]?\]/g, '.$1').split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const substituteDerivedExpression = (
  doc: Record<string, unknown>,
  expression: string,
): string => {
  let result = expression.trim();
  result = result.replace(
    /LENGTH\(\s*DOC\.(\w+)\s*\)/g,
    (_, prop) => `${Array.isArray(doc[prop]) ? doc[prop].length : 0}`,
  );
  result = result.replace(/DOC\.([a-zA-Z0-9_.]+)/g, (_, path) => {
    const value = getPath(doc, path);
    return JSON.stringify(value ?? null);
  });
  return result;
};

export const evaluateDerived = async (
  db: PgDb,
  doc: Doc,
  derived: DerivedProperty,
): Promise<unknown> => {
  const expression = derived.expression.trim();

  if (expression.includes('FOR edge IN postSeen')) {
    const fromMatch = expression.match(/profiles\/([^"]+)/);
    const profileId = fromMatch?.[1];
    if (profileId) {
      const edgeTableRef = getEdgeTable('postSeen');
      const edgeTable = asTable(edgeTableRef);
      const rows = await db
        .select()
        .from(edgeTableRef as never)
        .where(
          and(
            eq(edgeTable.fromId as never, profileId),
            eq(edgeTable.toId as never, doc.id as string),
          ),
        )
        .limit(1);
      return rows.length > 0;
    }
    return false;
  }

  if (expression.includes('FOR post IN posts')) {
    const postsTableRef = getTableForCollection('posts');
    const postsTable = asTable(postsTableRef);
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(postsTableRef as never)
      .where(
        and(
          eq(postsTable.creatorId as never, doc.id as string),
          sql`${postsTable.deletedAt} IS NULL`,
        ),
      );
    return (rows[0] as { count?: number } | undefined)?.count ?? 0;
  }

  if (expression.includes('FOR edge IN entries')) {
    const edgeTableRef = getEdgeTable('entries');
    const edgeTable = asTable(edgeTableRef);
    const rows = await db
      .select({ max: sql<string>`max(${edgeTable.createdAt})` })
      .from(edgeTableRef as never)
      .where(eq(edgeTable.fromId as never, doc.id as string));
    return (rows[0] as { max?: string | null } | undefined)?.max ?? null;
  }

  if (expression.includes('FOR edge IN postGroups')) {
    const edgeTableRef = getEdgeTable('postGroups');
    const edgeTable = asTable(edgeTableRef);
    const rows = await db
      .select()
      .from(edgeTableRef as never)
      .where(eq(edgeTable.toId as never, doc.id as string))
      .orderBy(sql`${edgeTable.createdAt} DESC`)
      .limit(1);
    return (rows[0] as Record<string, unknown> | undefined)?.createdAt ?? null;
  }

  if (expression.startsWith('{')) {
    try {
      const substituted = substituteDerivedExpression(doc, expression);
      return new Function(`return ${substituted};`)();
    } catch {
      return undefined;
    }
  }

  if (expression.startsWith('DOC.')) {
    return getPath(doc, expression.slice(4));
  }

  try {
    const substituted = substituteDerivedExpression(doc, expression);
    return new Function(`return ${substituted};`)();
  } catch {
    return undefined;
  }
};

export const deleteRelationsFor = async (
  db: PgDb,
  startId: string,
  relation: Relation & { mapping: MapData<object, object> },
) => {
  const edgeTableRef = getEdgeTable(
    edgeCollectionName(relation.edgeCollection),
  );
  const edgeTable = asTable(edgeTableRef);
  const parentCol = edgeTable[parentEdgeColumn(relation)] as never;
  const vertexCol = vertexEdgeColumn(relation);
  const edgeRows = await db
    .select()
    .from(edgeTableRef as never)
    .where(eq(parentCol, startId));

  for (const edge of edgeRows) {
    const vertexId = (edge as Record<string, unknown>)[vertexCol] as string;
    if (relation.mapping.collection) {
      const vertexTableRef = getTableForCollection(relation.mapping.collection);
      const vertexTable = asTable(vertexTableRef);
      await db
        .delete(vertexTableRef as never)
        .where(eq(vertexTable.id as never, vertexId));
    }
    await db
      .delete(edgeTableRef as never)
      .where(
        eq(
          edgeTable.id as never,
          (edge as Record<string, unknown>).id as string,
        ),
      );
  }
};
