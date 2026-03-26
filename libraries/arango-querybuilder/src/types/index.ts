import { DocumentCollection, EdgeCollection } from 'arangojs/collections';
import { AqlQuery, AqlLiteral } from 'arangojs/aql';
import { Document, DocumentMetadata, Patch } from 'arangojs/documents';
import { Database } from 'arangojs';
import { Cursor } from 'arangojs/cursors';
import { EnsureIndexOptions } from 'arangojs/indexes';

export interface CollectionInfo {
    name: string;
    edge?: boolean;
    indices?: EnsureIndexOptions[];
}

export type EdgeCollectionInfo = CollectionInfo & {
    edge: true;
};

export interface FilterList {
    operator: '&&' | '||';
    predicates: Filter[];
}
export interface Matcher {
    matches: Record<string, unknown> | Record<string, unknown>[];
    name: AqlLiteral;
}

export type Expression = AqlQuery | string;

export type Filter = FilterList | AqlQuery | AqlLiteral | Matcher;

export interface OMFilterList<O> {
    operator: '&&' | '||';
    predicates: OMFilter<O>[];
}

export type OMMatcher<O> = {
    matches: Patch<O & DocumentMetadata> | Patch<O & DocumentMetadata>[];
}

export type OMFilter<O> = string | OMMatcher<O> | OMFilterList<O>;

export interface Collect {
    expressions?: [string, AqlQuery][];
    withCount?: boolean;
    aggregate?: [string, AqlQuery][];
    into?: [string | AqlLiteral, AqlQuery?];
}

export type SortDirection = 'ASC' | 'DESC' | undefined;

export interface Sort {
    expressions: [AqlQuery, SortDirection][];
}

export type Limit = number | [number, number];

export interface Variable {
    name: string | AqlLiteral;
    expression: AqlQuery | AqlLiteral | string;
}

export type Operation =
    | {
        type: 'filter';
        filter?: Filter;
    }
    | {
        type: 'collect';
        collect: Collect;
    }
    | {
        type: 'sort';
        sort: Sort;
    }
    | {
        type: 'limit';
        limit: Limit;
    }
    | {
        type: 'variable';
        variable: Variable;
    };

export type QueryCollectionDefinition = DocumentCollection | string | { alias: string | AqlLiteral, collection: DocumentCollection | string | AqlQuery };

export interface QueryData {
    collections: QueryCollectionDefinition[];
    search?: AqlQuery | string;
    operations: Operation[];
    returnExpression?: AqlQuery | AqlLiteral | string;
}

export interface TraversalOptions {
    edgeCollections?: EdgeCollection | EdgeCollection[];
    vertexCollections?: DocumentCollection | DocumentCollection[];
    order?: 'bfs' | 'dfs' | 'weighted';
    uniqueVertices?: 'path' | 'global' | 'none';
    uniqueEdges?: 'path' | 'none';
    parallelism?: number;
}

export type TraversalDirection = 'INBOUND' | 'OUTBOUND' | 'ANY';

export interface TraversalData {
    start?: Document | AqlLiteral | AqlQuery;
    vertexName: string | AqlLiteral;
    edgeName?: string | AqlLiteral;
    pathName?: string | AqlLiteral;
    depth?: Limit;
    direction?: TraversalDirection;
    collections?: (EdgeCollection | string)[];
    prune?: Filter;
    operations: Operation[];
    returnExpression?: AqlQuery | AqlLiteral | string;
}



export type QueryBuilder<T> = {
    collection: (collection: QueryCollectionDefinition) => QueryBuilder<T>;
    search: (searchTerm?: AqlQuery | string) => QueryBuilder<T>;
    operations: (operations: Operation[]) => QueryBuilder<T>;
    filter: (filter?: Filter) => QueryBuilder<T>;
    collect: (collect: Collect) => QueryBuilder<T>;
    sort: (sort?: Sort) => QueryBuilder<T>;
    limit: (limit?: Limit) => QueryBuilder<T>;
    variable: (variable?: Variable) => QueryBuilder<T>;
    returnExpression: (returnExpression: AqlQuery | AqlLiteral | string | undefined) => QueryBuilder<T>;
    all: (db: Database) => Promise<T[]>;
    count: (db: Database) => Promise<number>;
    first: (db: Database) => Promise<T | undefined>;
    cursor: (db: Database) => Promise<Cursor<T>>;
    query: () => AqlQuery<T>;
};

export type TraversalBuilder<T> = {
    start: (start: Document | AqlLiteral | AqlQuery) => TraversalBuilder<T>;
    vertexName: (vertexName: string | AqlLiteral) => TraversalBuilder<T>;
    edgeName: (edgeName: string | AqlLiteral) => TraversalBuilder<T>;
    pathName: (pathName: string | AqlLiteral) => TraversalBuilder<T>;
    depth: (depth: Limit) => TraversalBuilder<T>;
    direction: (direction: TraversalDirection) => TraversalBuilder<T>;
    collections: (collections: (EdgeCollection | string)[]) => TraversalBuilder<T>;
    prune: (prune: Filter) => TraversalBuilder<T>;
    operations: (operations: Operation[]) => TraversalBuilder<T>;
    filter: (filter?: Filter) => TraversalBuilder<T>;
    collect: (collect?: Collect) => TraversalBuilder<T>;
    sort: (sort?: Sort) => TraversalBuilder<T>;
    limit: (limit?: Limit) => TraversalBuilder<T>;
    variable: (variable: Variable) => TraversalBuilder<T>;
    returnExpression: (returnExpression: AqlQuery | AqlLiteral | string) => TraversalBuilder<T>;
    all: (db: Database) => Promise<T[]>;
    count: (db: Database) => Promise<number>;
    first: (db: Database) => Promise<T | undefined>;
    cursor: (db: Database) => Promise<Cursor<T>>;
    traversal: () => AqlQuery<T>;
    query: () => AqlQuery<T>;
};

export interface DerivedProperty {
    alias: string | AqlLiteral;
    expression: string;
}

export type ObjectSort = [string, SortDirection][];

export interface Relation<O extends object = object, E extends object = O> {
    alias: string;
    edgeCollection: EdgeCollection | string;
    direction: TraversalDirection;
    maxDepth?: number;
    edgeFilter?: OMFilter<E>
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
}

export type RelationWithMapping<O extends object = object, E extends object = O> = Relation<O, E> & { mapping: MapData<O> };

export type WithId<T extends object> = T & { id: string };

export interface SearchDefinition {
    view: string;
    analyzer: string;
    fields: string[];
    query: string;
    limit?: Limit;
}

export interface QueryResult<T extends object> {
    all: (db: Database) => Promise<T[]>;
    count: (db: Database) => Promise<number>;
    first: (db: Database) => Promise<T | undefined>;
    cursor: (db: Database) => Promise<Cursor<T>>;
    limit: (limit: Limit) => QueryResult<T>;
    query: () => AqlQuery<T>;
}

export type Mapping<T extends object, O extends object = WithId<T>, F extends object = O> = {
    addRelation: (relation: Relation) => Mapping<T, O, F>;
    addRelations: (relations: Relation[]) => Mapping<T, O, F>;
    removeRelation: (predicate: (relation: Relation) => boolean) => Mapping<T, O, F>;
    addDerivedProperty: (derivedProperty: DerivedProperty) => Mapping<T, O, F>;
    removeDefaultFilter: () => Mapping<T, O, F>;
    filter: (filter?: OMFilter<F>) => Mapping<T, O, F>;
    clearFilters: () => Mapping<T, O, F>;
    sort: (sort?: ObjectSort) => Mapping<T, O, F>;
    limit: (limit: Limit) => Mapping<T, O, F>;
    ignoreSoftDelete: () => Mapping<T, O, F>;
    find: (db: Database, id: string, options?: { ignoreSoftDelete?: boolean }) => Promise<O | undefined>;
    findOneBy: (db: Database, filter: OMFilter<F>) => Promise<O | undefined>;
    all: (db: Database) => Promise<O[]>;
    fulltextSearch: (searchDefinition: SearchDefinition) => QueryResult<{ data: O, score: number }>;
    count: (db: Database) => Promise<number>;
    first: (db: Database) => Promise<O | undefined>;
    cursor: (db: Database) => Promise<Cursor<O>>;
    queryBuilder: () => QueryBuilder<O>;
    query: () => AqlQuery<O>;
    data: () => MapData<O, F>;
    relationsFrom: <R extends object, E extends object = R>(start: { id: string }, relation: RelationWithMapping<R, E>) => QueryResult<E>;
    create: (db: Database, data: T & { id?: string }) => Promise<O>;
    update: (db: Database, id: string, data: Patch<T>) => Promise<O>;
    delete: (db: Database, id: string) => Promise<void>;
    deleteRelations: (db: Database, id: string, relation: RelationWithMapping) => Promise<void>;
};



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

export interface FlattenedPath {
    path: (string | number)[];
    value: unknown;
}

export interface ViewInfo {
    name: string;
    type: 'search-alias';
    indexes: {
        collection: string;
        index: string;
    }[];
}
