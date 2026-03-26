import { aql } from "arangojs";
import { collectionElement, query, traversal } from "../raw";
import { DerivedProperty, Filter, ForeignKeyRelation, MapData, ObjectSort, OMFilter, QueryBuilder, Relation, SearchDefinition, Sort, TraversalBuilder } from "../types";
import { randomEdgeName, randomIdentifier, randomVertexName } from "../utils";
import { AqlLiteral, AqlQuery, isAqlLiteral, join, literal } from "arangojs/aql";
import { Document } from "arangojs/documents";

export const passThroughUndefined = <T>(f: ((value: T) => T)) => (value: T | undefined) => value === undefined ? undefined : f(value);

const replaceDoc = (expression: string, identifier: AqlLiteral) => expression.replaceAll('DOC', identifier.toAQL());

export const buildMergeRelationsExpression = (baseName: AqlLiteral, relations?: Relation[]) =>
    (relations && relations.length > 0) ?
        aql`
    MERGE(
    ${baseName}, 
    {
    ${join(relations.map(r => aql`${literal(r.alias)}: ${literal(r.count || r.cardinality === 'one' ? 'FIRST' : '')}( ${buildRelation(baseName, r).traversal()})`), ', ')}
    })` :
        baseName;

export const buildMergeForeignKeyRelationsExpression = (baseName: AqlLiteral, foreignKeyRelations?: ForeignKeyRelation[]) =>
    (foreignKeyRelations && foreignKeyRelations.length > 0) ?
        aql`
    MERGE(
    ${baseName}, 
    {
    ${join(foreignKeyRelations.map(r => aql`${literal(r.alias)}: FIRST( ${buildForeignKeyRelation(baseName, r).query()})`), ', ')}
    })` :
        baseName;

export const buildDerivedProperty = (baseName: AqlLiteral, derivedProperty: DerivedProperty): AqlQuery => {
    return aql`${literal(derivedProperty.alias)}: ${literal(replaceDoc(derivedProperty.expression, baseName))}`;
}

export const buildMergeDerivedPropertiesExpression = (baseName: AqlLiteral, derivedProperties?: DerivedProperty[]) =>
    (derivedProperties && derivedProperties.length > 0) ? aql`MERGE(${baseName}, {${join(derivedProperties.map(dp => buildDerivedProperty(baseName, dp)), ', ')}})` : baseName;


const unsetMetadata = (base: AqlQuery, keepMetadata: boolean | undefined) => keepMetadata ? base : aql`UNSET(${base}, '_key', '_rev', '_id', '_from', '_to')`;
const setId = (baseName: AqlLiteral | AqlQuery) => aql`MERGE(${baseName}, {id: ${baseName}._key})`;

export const documentToObject = (expression: AqlLiteral, keepMetadata: boolean | undefined) =>
    aql`${unsetMetadata(setId(expression), keepMetadata)}`;

export const buildFilter = <O extends Record<string, unknown>>(baseName: AqlLiteral, filter: OMFilter<O>): Filter => {
    if (typeof filter === 'object' && 'operator' in filter) {
        return {
            ...filter,
            predicates: filter.predicates.map(p => buildFilter(baseName, p))
        };
    } else if (typeof filter === 'object' && 'matches' in filter) {
        return {
            ...filter,
            name: baseName
        };
    } else if (typeof filter === 'string') {
        return literal(replaceDoc(filter, baseName));
    }
    return filter;
}

export const buildFilters = <O extends Record<string, unknown>>(baseName: AqlLiteral, filters: OMFilter<O>[]): Filter | undefined => {
    switch (filters.length) {
        case 0:
            return undefined;
        case 1:
            return buildFilter(baseName, filters[0]);
        default:
            return {
                operator: '&&',
                predicates: filters.map(f => buildFilter(baseName, f))
            }
    }
}


export const buildSort = (baseName: AqlLiteral, sort: ObjectSort): Sort =>
    ({ expressions: sort.map(([expression, direction]) => [aql`${literal(replaceDoc(expression, baseName))}`, direction]) });


export const addFilter = <O extends object, F>(mapData: MapData<O, F>, filter?: OMFilter<F>): MapData<O, F> => (filter ? {
    ...mapData,
    filters: [...(mapData.filters || []), filter]
} : mapData);


export const buildForeignKeyRelation = <O extends object>(baseName: AqlLiteral, foreignKeyRelation: ForeignKeyRelation<O>): QueryBuilder<O> =>
    buildMapQuery(addFilter(foreignKeyRelation.mapping, `DOC._key == ${baseName.toAQL()}.${foreignKeyRelation.foreignKeyProperty}`));


export const buildRelation = <O extends object, E extends object>(baseName: AqlLiteral | Document, relation: Relation<O, E>, softDelete: boolean = false): TraversalBuilder<E> => {

    const vertexName = randomVertexName();
    const vertexWithRelationsName = randomIdentifier('vertexWithRelations');
    const vertexWithForeignKeyRelationsName = randomIdentifier('vertexWithForeignKeyRelations');
    const vertexForFilterAndSortName = randomIdentifier('vertexForFilterAndSort');

    const vertexWithPostFilterRelationsName = randomIdentifier('vertexWithPostFilterRelations');
    const vertexWithPostFilterForeignKeyRelationsName = randomIdentifier('vertexWithPostFilterForeignKeyRelations');
    const vertexReturnName = randomIdentifier('vertexReturn');



    const edgeName = randomEdgeName();
    const returnName = randomIdentifier(relation.alias);
    const countName = randomIdentifier(`${relation.alias}Count`);

    const useVertex = relation.vertexAlias || relation.skipEdge;

    const vertexWithRelationsExpression = useVertex ?
        buildMergeRelationsExpression(
            vertexName,
            relation.mapping?.relations ?? []) : vertexName;

    const vertexWithDerivedPropertiesExpression = useVertex ?
        buildMergeDerivedPropertiesExpression(
            vertexWithRelationsName,
            relation.mapping?.derivedProperties ?? []) : vertexName;


    const vertexWithPostFilterRelationsExpression = buildMergeRelationsExpression(
        vertexForFilterAndSortName,
        relation.mapping?.postFilterRelations ?? [])
    const vertexWithPostFilterForeignKeyRelationsExpression = buildMergeForeignKeyRelationsExpression(
        vertexWithPostFilterRelationsName,
        relation.mapping?.postFilterForeignKeyRelations ?? [])
    const vertexReturnExpression = buildMergeDerivedPropertiesExpression(
        vertexWithPostFilterForeignKeyRelationsName,
        relation.mapping?.postFilterDerivedProperties ?? [])

    const returnExpression = relation.skipEdge ?
        vertexReturnName :
        relation.vertexAlias ?
            aql`MERGE(${edgeName}, {${literal(relation.vertexAlias)}: ${documentToObject(vertexReturnName, true)}})` :
            edgeName;


    return traversal<E>()
        .start(baseName)
        .direction(relation.direction)
        .depth(relation.maxDepth ? [1, relation.maxDepth] : 1)
        .vertexName(vertexName)
        .edgeName(edgeName)
        .collections([relation.edgeCollection])
        .filter(aql`${literal(vertexName)} != null`)
        .filter(relation.edgeFilter && buildFilter(edgeName, relation.edgeFilter) || undefined)
        .filter(softDelete ? aql`!${literal(vertexName)}.deletedAt` : undefined)
        .variable({
            name: vertexWithRelationsName, expression: vertexWithRelationsExpression
        })
        .variable({
            name: vertexWithForeignKeyRelationsName, expression: vertexWithDerivedPropertiesExpression
        })
        .variable({
            name: vertexForFilterAndSortName, expression: vertexWithDerivedPropertiesExpression
        })
        .filter(relation.mapping?.defaultFilter && buildFilter(vertexForFilterAndSortName, relation.mapping.defaultFilter) || undefined)
        .filter(relation.mapping?.softDelete ? aql`!${literal(vertexForFilterAndSortName)}.deletedAt` : undefined)
        .filter(relation.mapping?.filters && buildFilters(vertexForFilterAndSortName, relation.mapping.filters) || undefined)
        .sort(relation.mapping?.sort && buildSort(vertexForFilterAndSortName, relation.mapping.sort))
        .limit(relation.mapping?.limit)
        .variable({
            name: vertexWithPostFilterRelationsName, expression: vertexWithPostFilterRelationsExpression
        })
        .variable({
            name: vertexWithPostFilterForeignKeyRelationsName, expression: vertexWithPostFilterForeignKeyRelationsExpression
        })
        .variable({
            name: vertexReturnName, expression: vertexReturnExpression
        })
        .variable({
            name: returnName, expression: returnExpression
        })
        .collect(relation.count ? { withCount: true, into: [countName] } : undefined)
        .returnExpression(aql`RETURN ${relation.count ? countName : documentToObject(returnName, relation.mapping?.keepMetadata)}`);

}

export const throwIfUndefined = (message: string) => <T>(value: T | undefined) => {
    if (value === undefined) {
        throw new Error(`Value is undefined: ${message}`);
    }
    return value;
}

const buildSearchExpression = (searchDefinition: SearchDefinition, objectName: AqlLiteral) =>
    aql`${join(searchDefinition.fields.map(field =>
        aql`(TOKENS(${searchDefinition.query}, ${searchDefinition.analyzer}) ALL == ${objectName}.${literal(field)} OR LIKE(${objectName}.${literal(field)}, CONCAT("%", LOWER(${searchDefinition.query}), "%")))`
    ), ' OR ')}`;

export const buildMapQuery = <O extends object, F extends object = O>(mapData: MapData<O, F>, searchDefinition?: SearchDefinition): QueryBuilder<O> => {
    const objectName = randomIdentifier(collectionElement(mapData.collection));
    const withRelations = randomIdentifier(collectionElement(mapData.collection));
    const withForeignKeys = randomIdentifier(collectionElement(mapData.collection));
    const forFilterAndSort = randomIdentifier(collectionElement(mapData.collection));

    const withPostFilterRelations = randomIdentifier(collectionElement(mapData.collection));
    const withPostFilterForeignKeyRelations = randomIdentifier(collectionElement(mapData.collection));
    const returnName = randomIdentifier(collectionElement(mapData.collection));

    const mergeRelationsExpression = buildMergeRelationsExpression(objectName, mapData.relations);
    const mergeForeignKeyRelationsExpression = buildMergeForeignKeyRelationsExpression(withRelations, mapData.foreignKeyRelations);
    const mergeDerivedPropertiesExpression = buildMergeDerivedPropertiesExpression(withForeignKeys, mapData.derivedProperties);

    const postFilterRelationsExpression = buildMergeRelationsExpression(forFilterAndSort, mapData.postFilterRelations);
    const postFilterForeignKeyRelationsExpression = buildMergeForeignKeyRelationsExpression(withPostFilterRelations, mapData.postFilterForeignKeyRelations);
    const postFilterDerivedPropertiesExpression = buildMergeDerivedPropertiesExpression(withPostFilterForeignKeyRelations, mapData.postFilterDerivedProperties);

    const returnExpression = searchDefinition ?
        aql`{data: ${documentToObject(returnName, mapData.keepMetadata)}, score: BM25(${objectName})}` :
        documentToObject(returnName, mapData.keepMetadata);

    return query<O>()
        .collection({ alias: objectName, collection: searchDefinition ? searchDefinition.view : mapData.collection })
        .search(searchDefinition ? buildSearchExpression(searchDefinition, objectName) : undefined)
        .variable({
            name: withRelations,
            expression: mergeRelationsExpression
        })
        .variable({
            name: withForeignKeys,
            expression: mergeForeignKeyRelationsExpression
        })
        .variable({ name: forFilterAndSort, expression: mergeDerivedPropertiesExpression })
        .filter(mapData.filters && buildFilters(forFilterAndSort, mapData.filters) || undefined)
        .filter(mapData.softDelete ? aql`!${literal(forFilterAndSort)}.deletedAt` : undefined)
        .filter(mapData.defaultFilter && buildFilter(forFilterAndSort, mapData.defaultFilter) || undefined)
        .sort(searchDefinition ? { expressions: [[aql`BM25(${objectName})`, 'DESC']] } : mapData.sort && buildSort(forFilterAndSort, mapData.sort))
        .limit(mapData.limit)
        .variable({
            name: withPostFilterRelations,
            expression: postFilterRelationsExpression
        })
        .variable({
            name: withPostFilterForeignKeyRelations,
            expression: postFilterForeignKeyRelationsExpression
        })
        .variable({
            name: returnName,
            expression: postFilterDerivedPropertiesExpression
        })
        .returnExpression(aql`RETURN ${returnExpression}`);

}