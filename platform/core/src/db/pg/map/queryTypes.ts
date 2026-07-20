import type { PgDb } from '../client';
import type { SqlFilter } from '../filters/types';
import type { SQL } from 'drizzle-orm';
import type { PgTable } from './registry';

export type { SqlFilter };

export type SortDirection = 'ASC' | 'DESC' | undefined;

export type Limit = number | [number, number];

export type ObjectSort = [string, SortDirection][];

export type OMFilterList<O extends object> = {
  operator: '&&' | '||';
  predicates: PgFilter<O>[];
};

export type OMMatcher<O extends object> = {
  matches: Partial<O> | Partial<O>[];
};

export type OMFilter<O extends object> =
  | string
  | OMMatcher<O>
  | OMFilterList<O>;

export type PgFilter<O extends object = Record<string, unknown>> =
  | OMFilter<O>
  | SqlFilter;

export type WithId<T extends object> = T & { id: string };

export type ActivityWindow = { start?: Date; end?: Date };

export type ComputedFieldContext = {
  table: PgTable;
  collection: string;
  activityWindow?: ActivityWindow;
};

export type ComputedField = {
  alias: string;
  expr: (ctx: ComputedFieldContext) => SQL;
};

export type DerivedDoc = Record<string, unknown>;

export interface DerivedProperty {
  alias: string;
  resolve: (db: PgDb, doc: DerivedDoc) => Promise<unknown> | unknown;
}

export type TraversalDirection = 'INBOUND' | 'OUTBOUND' | 'ANY';

export interface Relation<O extends object = object, E extends object = O> {
  alias: string;
  edgeCollection: string | { name: string };
  direction: TraversalDirection;
  maxDepth?: number;
  edgeFilter?: PgFilter<E>;
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

export interface MapData<O extends object, F extends object = O> {
  collection: string;
  relations?: Relation[];
  foreignKeyRelations?: ForeignKeyRelation[];
  derivedProperties?: DerivedProperty[];
  computedFields?: ComputedField[];
  activityWindow?: ActivityWindow;
  postFilterRelations?: Relation[];
  postFilterForeignKeyRelations?: ForeignKeyRelation[];
  postFilterDerivedProperties?: DerivedProperty[];
  defaultFilter?: PgFilter<F>;
  filters?: PgFilter<F>[];
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
