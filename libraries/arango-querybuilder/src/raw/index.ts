import { DocumentCollection, EdgeCollection } from 'arangojs/collections';
import { Database, aql } from 'arangojs';
import { AqlLiteral, AqlQuery, literal, join, isAqlLiteral } from 'arangojs/aql';
import { Document } from 'arangojs/documents';
import debug from 'debug';
import {
  Filter,
  FilterList,
  Collect,
  Sort,
  Variable,
  Operation,
  QueryData,
  TraversalData,
  TraversalDirection,
  QueryBuilder,
  TraversalBuilder,
  Expression,
  Limit,
  QueryCollectionDefinition,
  Matcher,
  FlattenedPath
} from '../types';
import { ensureLiteral, flattenObject, pathToString, randomEdgeName, randomPathName } from '../utils';

const log = debug('allpeep:db:querybuilder');

export { literal, join } from 'arangojs/aql';

export const nodeName = (collection: DocumentCollection) =>
  literal(collection.name.slice(0, -1));

export const toAqlTemplate = (queryString: string): AqlQuery => {
  return aql`${literal(queryString)}`;
};

interface TraversalOptions {
  edgeCollections?: EdgeCollection | EdgeCollection[];
  vertexCollections?: DocumentCollection | DocumentCollection[];
  order?: 'bfs' | 'dfs' | 'weighted';
  uniqueVertices?: 'path' | 'global' | 'none';
  uniqueEdges?: 'path' | 'none';
  parallelism?: number;
}


export const and = (...filters: Filter[]): FilterList => ({
  operator: '&&',
  predicates: filters,
});
export const or = (...filters: Filter[]): FilterList => ({
  operator: '||',
  predicates: filters,
});
export const eq = (left: Expression, right: Expression) =>
  aql`${left} == ${right}`;
export const neq = (left: Expression, right: Expression) =>
  aql`${left} != ${right}`;
export const gt = (left: Expression, right: Expression) =>
  aql`${left} > ${right}`;
export const gte = (left: Expression, right: Expression) =>
  aql`${left} >= ${right}`;
export const lt = (left: Expression, right: Expression) =>
  aql`${left} < ${right}`;
export const lte = (left: Expression, right: Expression) =>
  aql`${left} <= ${right}`;

const buildFilterList = (filterList: FilterList): AqlQuery | undefined =>
  filterList.predicates.length > 0 ? aql`( ${join(filterList.predicates.map(buildFilterElement).filter(Boolean), ` ${filterList.operator} `)} )` : undefined;

const buildMatchCondition = (name: AqlLiteral, property: FlattenedPath): AqlQuery =>
  aql`${name}.${literal(pathToString(property.path))} == ${property.value as object}`;

const buildSingleMatchFilterElement = (name: AqlLiteral, example: Record<string, unknown>): AqlQuery | undefined => {
  const flattened = flattenObject(example);
  if (flattened.length === 0) {
    return undefined;
  }
  else if (flattened.length === 1) {
    return buildMatchCondition(name, flattened[0]);
  } else {
    return buildFilterList(and(
      ...flattened.map(property => buildMatchCondition(name, property))
    ));
  }
}

const buildMatchFilterElement = (filter: Matcher): AqlQuery | undefined =>
  Array.isArray(filter.matches) ?
    buildFilterList(or(...filter.matches.map(m => buildSingleMatchFilterElement(filter.name, m)).filter(Boolean) as Filter[])) :
    buildSingleMatchFilterElement(filter.name, filter.matches);

const buildFilterElement = (filter?: Filter): AqlQuery | undefined =>
  filter &&
  ('operator' in filter
    ? buildFilterList(filter as FilterList)
    : 'matches' in filter ? buildMatchFilterElement(filter as Matcher) : (isAqlLiteral(filter) ? aql`${filter}` : filter)
  );

const buildFilter = (filter?: Filter): AqlQuery | undefined =>
  filter &&
  aql`FILTER ${buildFilterElement(filter)}`;


const buildAggregate = (aggregate?: [string, AqlQuery][]) =>
  aggregate?.length
    ? aql` AGGREGATE ${join(
      aggregate.map(
        ([name, expression]) => aql`${literal(name)} = ${expression}`,
      ),
      ', ',
    )}`
    : undefined;

const buildCollect = (collect?: Collect) =>
  collect &&
  aql`
    COLLECT ${collect.expressions
      ? join(
        collect.expressions?.map(
          ([name, expression]) => aql`${literal(name)} = ${expression}`,
        ),
        ', ',
      )
      : undefined
    }
    ${literal(collect.withCount ? ' WITH COUNT ' : '')}
    ${buildAggregate(collect.aggregate)}
    INTO ${ensureLiteral(collect.into?.[0] || 'collected')} ${collect.into?.[1]}
  `;

const buildSort = (sort?: Sort) =>
  sort &&
  aql`SORT ${join(
    sort.expressions.map(
      ([expression, direction]) => aql`${expression} ${literal(direction)}`,
    ),
    ', ',
  )}`;

const buildLimit = (limit?: Limit) =>
  limit &&
  aql`LIMIT ${Array.isArray(limit) ? aql`${limit[0]}, ${limit[1]}` : limit}`;

const buildVariable = (variable?: Variable) =>
  variable && aql`LET ${variable.name} = ${variable.expression}`;

export const collectionElement = (collection: DocumentCollection | string) =>
  (typeof collection === 'string' ? collection : collection.name).slice(0, -1);


const collectionFromDefinition = (definition: QueryCollectionDefinition) =>
  typeof definition === 'object' && 'alias' in definition ? definition.collection : definition;

const aliasFromDefinition = (definition: QueryCollectionDefinition) =>
  literal(typeof definition === 'object' && 'alias' in definition ? definition.alias : collectionElement(definition));

const buildQueryReturnExpression = (queryData: QueryData) =>
  queryData.returnExpression
    ? typeof queryData.returnExpression === 'string'
      ? aql`RETURN ${literal(queryData.returnExpression)}`
      : queryData.returnExpression
    : aql`RETURN ${aliasFromDefinition(queryData.collections[0])}`;

const buildOperation = (operation: Operation) => {
  switch (operation.type) {
    case 'filter':
      return buildFilter(operation.filter);
    case 'collect':
      return buildCollect(operation.collect);
    case 'variable':
      return buildVariable(operation.variable);
    case 'limit':
      return buildLimit(operation.limit);
    case 'sort':
      return buildSort(operation.sort);
  }
};

const ensureCollectionOrLiteral = (input: DocumentCollection | string | AqlQuery) =>
  typeof input === 'string' ? literal(input) : input;

const buildQueryFor = (definition: QueryCollectionDefinition) => {
  const collection = collectionFromDefinition(definition);
  return aql`FOR ${aliasFromDefinition(definition)} IN (${ensureCollectionOrLiteral(collection)})`;
}

const buildQuery = <T>(queryData: QueryData): AqlQuery<T> => {
  if (!queryData.collections) {
    throw new Error('Collection is missing');
  }

  const query = aql<T>`
    ${join(queryData.collections.map(buildQueryFor), '\n')}
    ${queryData.search ? aql`SEARCH ${queryData.search}` : literal('')}
    ${join(queryData.operations.map(buildOperation), '\n')}
    
    ${buildQueryReturnExpression(queryData)}
  `;

  log(query.query, query.bindVars);
  log(queryData.returnExpression, query.query.length);

  return query;
};

export const query = <T>(
  queryData: QueryData = { collections: [], operations: [] },
): QueryBuilder<T> => ({
  collection: (collection: QueryCollectionDefinition) =>
    query<T>({
      ...queryData,
      collections: [...queryData.collections, collection],
    }),
  search: (searchTerm?: AqlQuery | string) =>
    query<T>({
      ...queryData,
      search: searchTerm
    }),
  operations: (operations: Operation[]) =>
    query<T>({
      ...queryData,
      operations: [...queryData.operations, ...operations],
    }),
  filter: (filter?: Filter) =>
    filter
      ? query<T>({
        ...queryData,
        operations: [...queryData.operations, { type: 'filter', filter }],
      })
      : query<T>(queryData),
  collect: (collect: Collect) =>
    query<T>({
      ...queryData,
      operations: [...queryData.operations, { type: 'collect', collect }],
    }),
  sort: (sort?: Sort) =>
    query<T>({
      ...queryData,
      operations: sort ? [...queryData.operations, { type: 'sort', sort }] : queryData.operations,
    }),
  limit: (limit?: Limit) =>
    query<T>({
      ...queryData,
      operations: limit ? [...queryData.operations, { type: 'limit', limit }] : queryData.operations,
    }),
  variable: (variable?: Variable) =>
    query<T>({
      ...queryData,
      operations: variable
        ? [...queryData.operations, { type: 'variable', variable }]
        : [...queryData.operations],
    }),
  returnExpression: (returnExpression: AqlQuery | AqlLiteral | string | undefined) =>
    query<T>({ ...queryData, returnExpression }),
  all: (db: Database) =>
    db.query<T>(buildQuery<T>(queryData)).then((r) => r.all()),
  count: (db: Database) =>
    db
      .query<number>(
        query<T>(queryData)
          .collect({ withCount: true })
          .returnExpression('collected')
          .query(),
      )
      .then((r) => r.next())
      .then((count) => count ?? 0),
  first: (db: Database) =>
    db.query<T>(buildQuery<T>(queryData)).then((r) => r.next()),
  cursor: (db: Database) => db.query<T>(buildQuery<T>(queryData)),
  query: () => buildQuery<T>(queryData),
});

const buildDepth = (depth?: Limit) =>
  depth && aql`${Array.isArray(depth) ? aql`${depth[0]}..${depth[1]}` : depth}`;

const buildTraversalReturnExpression = (traversalData: TraversalData) =>
  traversalData.returnExpression
    ? typeof traversalData.returnExpression === 'string'
      ? aql`RETURN ${literal(traversalData.returnExpression)}`
      : traversalData.returnExpression
    : aql`RETURN v`;

const buildTraversalForExpression = (traversalData: TraversalData) =>
  aql`FOR ${ensureLiteral(traversalData.vertexName)}, ${ensureLiteral(traversalData.edgeName || randomEdgeName())}, ${ensureLiteral(traversalData.pathName || randomPathName())}`;

const buildTraversal = <T>(traversalData: TraversalData): AqlQuery<T> => {
  if (!traversalData.start) {
    throw new Error('Start is missing');
  }

  if (!traversalData.collections) {
    throw new Error('Edge collections are missing');
  }

  const query = aql<T>`
    ${buildTraversalForExpression(traversalData)} 
    IN ${buildDepth(traversalData.depth)}
    ${literal(traversalData.direction || 'OUTBOUND')} ${traversalData.start}
    ${join(traversalData.collections.map(ensureCollectionOrLiteral), ', ')}
    ${join(traversalData.operations.map(buildOperation), '\n')}
    ${buildTraversalReturnExpression(traversalData)}
`;

  log(query.query, query.bindVars);

  return query;
};

export const traversal = <T>(
  traversalData: TraversalData = {
    operations: [],
    vertexName: 'v',
  },
): TraversalBuilder<T> => {
  return {
    start: (start: Document | AqlLiteral | AqlQuery) =>
      traversal<T>({
        ...traversalData,
        start,
      }),
    vertexName: (vertexName: string | AqlLiteral) =>
      traversal<T>({ ...traversalData, vertexName }),
    edgeName: (edgeName: string | AqlLiteral) =>
      traversal<T>({ ...traversalData, edgeName }),
    pathName: (pathName: string | AqlLiteral) =>
      traversal<T>({ ...traversalData, pathName }),
    depth: (depth: Limit) => traversal<T>({ ...traversalData, depth }),
    direction: (direction: TraversalDirection) =>
      traversal<T>({ ...traversalData, direction }),
    collections: (collections: (EdgeCollection | string)[]) =>
      traversal<T>({ ...traversalData, collections }),
    prune: (prune: Filter) => traversal<T>({ ...traversalData, prune }),
    operations: (operations: Operation[]) =>
      traversal<T>({ ...traversalData, operations }),
    filter: (filter?: Filter) =>
      traversal<T>({
        ...traversalData,
        operations: filter
          ? [...traversalData.operations, { type: 'filter', filter }]
          : traversalData.operations,
      }),
    collect: (collect?: Collect) =>
      traversal<T>({
        ...traversalData,
        operations: collect ? [...traversalData.operations, { type: 'collect', collect }] : traversalData.operations,
      }),
    sort: (sort?: Sort) =>
      traversal<T>({
        ...traversalData,
        operations: sort ? [...traversalData.operations, { type: 'sort', sort }] : traversalData.operations,
      }),
    limit: (limit?: Limit) =>
      traversal<T>({
        ...traversalData,
        operations: limit ? [...traversalData.operations, { type: 'limit', limit }] : traversalData.operations,
      }),
    variable: (variable: Variable) =>
      traversal<T>({
        ...traversalData,
        operations: [
          ...traversalData.operations,
          { type: 'variable', variable },
        ],
      }),
    returnExpression: (returnExpression: AqlQuery | AqlLiteral | string) =>
      traversal<T>({ ...traversalData, returnExpression }),
    all: (db: Database) =>
      db.query<T>(buildTraversal<T>(traversalData)).then((r) => r.all()),
    first: (db: Database) =>
      db.query<T>(buildTraversal<T>(traversalData)).then((r) => r.next()),
    count: (db: Database) =>
      db
        .query<number>(
          traversal<T>(traversalData)
            .collect({ withCount: true })
            .returnExpression('collected')
            .traversal(),
        )
        .then((r) => r.next())
        .then((count) => count ?? 0),

    cursor: (db: Database) => db.query<T>(buildTraversal<T>(traversalData)),
    traversal: () => buildTraversal<T>(traversalData),
    query: () => buildTraversal<T>(traversalData),
  };
};
