import {
  and,
  eq,
  getTableColumns,
  inArray,
  sql,
  type Table,
} from 'drizzle-orm';
import type {
  DerivedProperty,
  ForeignKeyRelation,
  Limit,
  MapData,
  OMFilter,
  PgFilter,
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
import { isSqlFilter } from '../filters';
import {
  asTable,
  edgeRegistry,
  getTableForCollection,
  rowToDocument,
} from './registry';
import { normalizeComputedDatetime } from '../mappers';

type Doc = Record<string, unknown>;

const buildComputedSelect = (
  mapData: MapData<object, object>,
  tableRef: ReturnType<typeof getTableForCollection>,
) =>
  Object.fromEntries(
    (mapData.computedFields ?? []).map((field) => [
      field.alias,
      field.expr({
        table: tableRef,
        collection: mapData.collection,
        activityWindow: mapData.activityWindow,
      }),
    ]),
  );

const mapRowToDoc = (
  mapData: MapData<object, object>,
  row: Record<string, unknown>,
): Doc => {
  const doc = rowToDocument(mapData.collection, row);
  for (const field of mapData.computedFields ?? []) {
    if (field.alias in row) {
      const value = row[field.alias];
      doc[field.alias] =
        field.alias === 'lastPostAt' ? normalizeComputedDatetime(value) : value;
    }
  }
  return doc;
};

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

/**
 * Like {@link fetchRowsByIds}, but applies mapping SQL filters (and SQL sort).
 * Returns `{ docs, postFilters }` so callers can hydrate with the remaining
 * OM filters — same split as {@link executeAll}.
 */
export const fetchFilteredRowsByIds = async (
  db: PgDb,
  mapData: MapData<object, object>,
  ids: string[],
): Promise<{
  docs: Doc[];
  postFilters: PgFilter<Record<string, unknown>>[];
}> => {
  if (!ids.length) return { docs: [], postFilters: [] };
  const tableRef = getTableForCollection(mapData.collection);
  const table = asTable(tableRef);
  const { sqlWhere, postFilters } = partitionFilters(
    mapData.collection,
    table,
    mapData.filters,
    mapData.defaultFilter,
    mapData.softDelete,
  );
  const conditions = [inArray(table.id as never, ids)];
  if (sqlWhere) {
    conditions.push(sqlWhere);
  }
  const orderBy = sortToSqlOrderBy(
    mapData.collection,
    tableRef,
    mapData.sort,
    mapData.activityWindow,
  );
  const columns = getTableColumns(tableRef as Table);
  const computedSelect = buildComputedSelect(mapData, tableRef);
  let query = db
    .select({ ...columns, ...computedSelect })
    .from(tableRef as never)
    .where(and(...conditions))
    .$dynamic();
  if (orderBy) {
    query = query.orderBy(...orderBy);
  }
  const rows = await query;
  let docs = rows.map((row) =>
    mapRowToDoc(mapData, row as Record<string, unknown>),
  );
  if (!orderBy) {
    docs = applySort(docs, mapData.sort);
  }
  return { docs, postFilters };
};

const hydrateDocuments = async (
  db: PgDb,
  collection: string,
  mapData: MapData<object, object>,
  rows: Doc[],
  postFilters?: PgFilter<Record<string, unknown>>[],
): Promise<Doc[]> => {
  let docs = rows;
  for (const relation of mapData.relations ?? []) {
    docs = await attachRelation(db, collection, docs, relation);
  }
  for (const fkr of mapData.foreignKeyRelations ?? []) {
    docs = await attachForeignKeyRelation(db, docs, fkr);
  }
  docs = await attachDerivedProperties(db, docs, mapData.derivedProperties);
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
  docs = await attachDerivedProperties(
    db,
    docs,
    mapData.postFilterDerivedProperties,
  );
  return docs;
};

const attachDerivedProperties = async (
  db: PgDb,
  docs: Doc[],
  derivedProperties?: DerivedProperty[],
): Promise<Doc[]> => {
  if (!derivedProperties?.length) return docs;
  let result = docs;
  for (const dp of derivedProperties) {
    if (dp.batchResolve) {
      const values = await dp.batchResolve(db, result);
      result = result.map((doc) => ({
        ...doc,
        [String(dp.alias)]: values.get(doc.id as string),
      }));
      continue;
    }
    result = await Promise.all(
      result.map(async (doc) => ({
        ...doc,
        [String(dp.alias)]: await evaluateDerived(db, doc, dp),
      })),
    );
  }
  return result;
};

export const hydrateMapData = async (
  db: PgDb,
  mapData: MapData<object, object>,
  rows: Doc[],
  postFilters?: PgFilter<Record<string, unknown>>[],
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
  const edgeExtraFilter =
    typeof relation.edgeFilter === 'string'
      ? applyDateRangeToEdgeSql(edgeTableRef, relation.edgeFilter)
      : isSqlFilter(relation.edgeFilter)
        ? relation.edgeFilter.where
        : undefined;
  if (edgeExtraFilter) edgeConditions.push(edgeExtraFilter);

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

const nodeCapFromLimit = (limit?: Limit): number | undefined => {
  if (limit == null) return undefined;
  return typeof limit === 'number' ? limit : limit[1];
};

const traverseRelation = async (
  db: PgDb,
  startId: string,
  relation: Relation,
): Promise<Doc[]> => {
  const maxDepth = relation.maxDepth ?? 1;
  const nodeCap = nodeCapFromLimit(relation.mapping?.limit);
  const edgeTableRef = getEdgeTable(
    edgeCollectionName(relation.edgeCollection),
  );
  const edgeTable = asTable(edgeTableRef);
  const collected: Doc[] = [];
  const visited = new Set<string>([startId]);
  let frontier = [startId];

  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    if (nodeCap !== undefined && collected.length >= nodeCap) break;

    const parentCol = edgeTable[parentEdgeColumn(relation)] as never;
    const vertexCol = vertexEdgeColumn(relation);
    const edgeRows = await db
      .select()
      .from(edgeTableRef as never)
      .where(inArray(parentCol, frontier));

    if (!edgeRows.length) break;

    let vertexIds = [
      ...new Set(
        edgeRows
          .map((e) => (e as Record<string, unknown>)[vertexCol] as string)
          .filter((id) => !visited.has(id)),
      ),
    ];
    if (!vertexIds.length) break;

    if (nodeCap !== undefined) {
      const remaining = nodeCap - collected.length;
      vertexIds = vertexIds.slice(0, remaining);
    }

    for (const id of vertexIds) {
      visited.add(id);
    }

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

  // BFS is nearest-first; conversation roots need mapping sort (e.g. id ASC).
  return applyLimit(
    applySort(collected, relation.mapping?.sort),
    relation.mapping?.limit,
  ) as Doc[];
};

export const executeFind = async (
  db: PgDb,
  collection: string,
  mapData: MapData<object, object>,
  id: string,
  ignoreSoftDelete = false,
): Promise<Doc | undefined> => {
  if (!id) return undefined;
  const tableRef = getTableForCollection(collection);
  const table = asTable(tableRef);
  const columns = getTableColumns(tableRef as Table);
  const computedSelect = buildComputedSelect(mapData, tableRef);
  const conditions = [eq(table.id as never, id)];
  if (!ignoreSoftDelete && mapData.softDelete !== false && table.deletedAt) {
    conditions.push(sql`${table.deletedAt} IS NULL`);
  }
  const rows = await db
    .select({ ...columns, ...computedSelect })
    .from(tableRef as never)
    .where(and(...conditions))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  const hydrated = await hydrateMapData(db, mapData, [
    mapRowToDoc(mapData, row as Record<string, unknown>),
  ]);
  return hydrated[0];
};

export const executeAll = async (
  db: PgDb,
  mapData: MapData<object, object>,
): Promise<Doc[]> => {
  const tableRef = getTableForCollection(mapData.collection);
  const table = asTable(tableRef);
  const { sqlWhere, postFilters } = partitionFilters(
    mapData.collection,
    table,
    mapData.filters,
    mapData.defaultFilter,
    mapData.softDelete,
  );
  const orderBy = sortToSqlOrderBy(
    mapData.collection,
    tableRef,
    mapData.sort,
    mapData.activityWindow,
  );
  const canSqlPaginate =
    postFilters.length === 0 && (!mapData.sort?.length || !!orderBy);

  const columns = getTableColumns(tableRef as Table);
  const computedSelect = buildComputedSelect(mapData, tableRef);

  let query = db
    .select({ ...columns, ...computedSelect })
    .from(tableRef as never)
    .$dynamic();
  if (sqlWhere) query = query.where(sqlWhere);
  if (canSqlPaginate && orderBy) query = query.orderBy(...orderBy);
  if (canSqlPaginate && mapData.limit) {
    query = applySqlLimit(query, mapData.limit);
  }

  const rows = await query;
  let docs = rows.map((row) =>
    mapRowToDoc(mapData, row as Record<string, unknown>),
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
  // Match attachRelation: honor maxDepth via BFS traversal. Without this,
  // callers like getConversationByStart only see direct (depth-1) replies.
  if (relation.maxDepth && relation.maxDepth > 1) {
    return traverseRelation(db, start.id, relation);
  }

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
    // Apply mapping SQL filters (e.g. documentKeyBefore for `start` cursors)
    // here — fetchRowsByIds alone ignores them, and applyPostFilters skips
    // SqlFilters, which previously broke chronological pagination for group /
    // profile / bookmark / hashtag feeds built via relationsFrom.
    const { docs, postFilters } = await fetchFilteredRowsByIds(
      db,
      relation.mapping,
      vertexIds,
    );
    return hydrateMapData(db, relation.mapping, docs, postFilters);
  }

  // Keep edge fields (e.g. roles) and attach the related vertex under
  // vertexAlias — same shape as hydrateDocuments/attachRelation.
  const value = await resolveRelationValue(
    db,
    edgeRows as Record<string, unknown>[],
    relation,
    parentCollection,
  );
  if (relation.cardinality === 'one') {
    return value ? [value as Doc] : [];
  }
  return (value as Doc[]) ?? [];
};

export const evaluateDerived = async (
  db: PgDb,
  doc: Doc,
  derived: DerivedProperty,
): Promise<unknown> => derived.resolve(db, doc);

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
