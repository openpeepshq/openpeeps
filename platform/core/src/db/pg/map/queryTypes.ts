import type { PgDb } from '../client';

export type SortDirection = 'ASC' | 'DESC' | undefined;

export type Limit = number | [number, number];

export type ObjectSort = [string, SortDirection][];

export type OMFilterList<O> = {
  operator: '&&' | '||';
  predicates: OMFilter<O>[];
};

export type OMMatcher<O> = {
  matches: Partial<O> | Partial<O>[];
};

export type OMFilter<O> = string | OMMatcher<O> | OMFilterList<O>;

export type WithId<T extends object> = T & { id: string };

export interface DerivedProperty {
  alias: string;
  expression: string;
}

export type TraversalDirection = 'INBOUND' | 'OUTBOUND' | 'ANY';

export interface Relation<O extends object = object, E extends object = O> {
  alias: string;
  edgeCollection: string | { name: string };
  direction: TraversalDirection;
  maxDepth?: number;
  edgeFilter?: OMFilter<E>;
  vertexAlias?: string;
  skipEdge?: boolean;
  cardinality: 'one' | 'many';
  mapping?: MapData<O>;
  count?: boolean;
}

export interface ForeignKeyRelation<O extends object = object> {
  alias: string;
  foreignKeyProperty: string;
  mapping: MapData<O>;
  cardinality?: 'one' | 'many';
}

export type RelationWithMapping<
  O extends object = object,
  E extends object = O,
> = Relation<O, E> & { mapping: MapData<O> };

export interface MapData<O, F = O> {
  collection: string;
  relations?: Relation[];
  foreignKeyRelations?: ForeignKeyRelation[];
  derivedProperties?: DerivedProperty[];
  postFilterRelations?: Relation[];
  postFilterForeignKeyRelations?: ForeignKeyRelation[];
  postFilterDerivedProperties?: DerivedProperty[];
  defaultFilter?: OMFilter<F>;
  filters?: OMFilter<F>[];
  sort?: ObjectSort;
  limit?: Limit;
  keepMetadata?: boolean;
  softDelete?: boolean;
}

export interface SearchDefinition {
  view: string;
  analyzer: string;
  fields: string[];
  query: string;
  limit?: Limit;
}

export interface CollectionIndex {
  name?: string;
  type?: string;
  fields?: unknown;
  unique?: boolean;
  analyzer?: string;
  [key: string]: unknown;
}

export interface CollectionInfo {
  name: string;
  edge?: boolean;
  indices?: CollectionIndex[];
}

export interface ViewInfo {
  name: string;
  type: 'search-alias';
  indexes: { collection: string; index: string }[];
}

export interface QueryResult<T extends object> {
  all: (db: PgDb) => Promise<T[]>;
  count: (db: PgDb) => Promise<number>;
  first: (db: PgDb) => Promise<T | undefined>;
  limit: (limit: Limit) => QueryResult<T>;
}
