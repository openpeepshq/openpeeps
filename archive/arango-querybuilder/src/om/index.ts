import { literal, traversal } from "../raw"
import { DerivedProperty, Limit, MapData, ObjectSort, OMFilter, QueryResult, Relation, RelationWithMapping, SearchDefinition, WithId } from "../types";
import { addFilter, buildMapQuery, buildRelation, throwIfUndefined } from "./helpers";
import { Mapping } from "../types";
import { Database } from "arangojs";
import { Patch } from "arangojs/documents";
import { uuidv7 } from "uuidv7";



const update = <T extends object, O extends { id: string } = WithId<T>, F extends object = O>(mapData: MapData<O, F>, db: Database, id: string, data: Patch<T>): Promise<O> => db.collection(mapData.collection).update(id, data)
    .then(() => map<T, O, F>(mapData).ignoreSoftDelete().filter({ matches: { _key: id } }).first(db))
    .then(throwIfUndefined(`update ${mapData.collection} ${id}`));



export const map = <T extends object, O extends { id: string } = WithId<T>, F extends object = O>(mapData: MapData<O, F>): Mapping<T, O, F> => ({

    addRelation: (relation: Relation) => map({
        ...mapData,
        relations: [...(mapData.relations || []), relation]
    }),

    addRelations: (relations: Relation[]) => map({
        ...mapData,
        relations: [...(mapData.relations || []), ...relations]
    }),

    removeRelation: (predicate: (relation: Relation) => boolean) => map({
        ...mapData,
        relations: mapData.relations?.filter(predicate)
    }),

    addDerivedProperty: (derivedProperty: DerivedProperty) => map({
        ...mapData,
        derivedProperties: [...(mapData.derivedProperties || []), derivedProperty]
    }),

    removeDefaultFilter: () => map({
        ...mapData,
        defaultFilter: undefined
    }),

    filter: (filter?: OMFilter<F>) => map(addFilter(mapData, filter)),

    clearFilters: () => map({
        ...mapData,
        filters: []
    }),

    sort: (sort?: ObjectSort) => sort ? map({
        ...mapData,
        sort
    }) : map(mapData),

    limit: (limit?: Limit) => limit ? map({
        ...mapData,
        limit
    }) : map(mapData),

    ignoreSoftDelete: () => map({
        ...mapData,
        softDelete: false
    }),
    find: (db: Database, id: string) => buildMapQuery<O, F>(addFilter(mapData, { matches: { _key: id } })).first(db),
    findOneBy: (db: Database, filter: OMFilter<F>) => buildMapQuery<O, F>(addFilter(mapData, filter)).first(db),
    all: (db: Database) => buildMapQuery<O, F>(mapData).all(db),
    fulltextSearch: (searchDefinition: SearchDefinition) =>
        buildMapQuery<{ data: O, score: number }, F>(mapData, searchDefinition),
    count: (db: Database) => buildMapQuery<O, F>(mapData).count(db),
    first: (db: Database) => buildMapQuery<O, F>(mapData).first(db),
    cursor: (db: Database) => buildMapQuery<O, F>(mapData).cursor(db),
    queryBuilder: () => buildMapQuery<O, F>(mapData),
    query: () => buildMapQuery<O, F>(mapData).query(),
    data: () => mapData,
    relationsFrom: <R extends object, E extends object = R>(start: { id: string }, relation: RelationWithMapping<R, E>) =>
        buildRelation({ _id: `${mapData.collection}/${start.id}` }, relation) as QueryResult<E>,
    create: (db: Database, data: T & { id?: string }): Promise<O> =>
        db.collection(mapData.collection).save({ ...data, _key: data.id || uuidv7() })
            .then(({ _key }) => map<T, O, F>(mapData).filter({ matches: { _key } }).first(db))
            .then(throwIfUndefined(`create ${mapData.collection}`)),
    update: (db: Database, id: string, data: Patch<T>): Promise<O> => update(mapData, db, id, data),
    delete: (db: Database, id: string) => mapData.softDelete ? update(mapData, db, id, { deletedAt: new Date().toISOString() }).then(() => undefined) : db.collection(mapData.collection).remove(id).then(() => undefined),
    deleteRelations: (db: Database, id: string, relation: RelationWithMapping) =>
        traversal()
            .start({ _id: `${mapData.collection}/${id}` })
            .vertexName('v')
            .edgeName('e')
            .collections([relation.edgeCollection])
            .direction(relation.direction)
            .returnExpression(literal(`REMOVE v IN ${relation.mapping.collection} \n REMOVE e IN ${relation.edgeCollection}`))
            .all(db)
            .then(() => undefined),

}); 
