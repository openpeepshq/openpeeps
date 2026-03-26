import { collectionInfos } from "../db";
import { baseProfilesMapping } from "../profiles";
import { postsMapping } from "../posts";
import { map } from "@openpeeps/arango-querybuilder";
import { creationDateFilter } from "./helpers";

export const profileWithActivityScoreMapping = (start?: Date, end?: Date) =>
    baseProfilesMapping
        .addRelations([
            {
                alias: 'entriesCount',
                edgeCollection: collectionInfos.entriesCollection.name,
                direction: 'OUTBOUND',
                cardinality: 'one',
                edgeFilter: creationDateFilter(start, end),
                count: true,
            },
            {
                alias: 'reactionsCount',
                edgeCollection: collectionInfos.reactionsCollection.name,
                direction: 'OUTBOUND',
                cardinality: 'one',
                edgeFilter: creationDateFilter(start, end),
                count: true,
            },
            {
                alias: 'followsCount',
                edgeCollection: collectionInfos.followsCollection.name,
                direction: 'OUTBOUND',
                cardinality: 'one',
                edgeFilter: creationDateFilter(start, end),
                count: true,
            },
        ])
        .addDerivedProperty({
            alias: 'activityScore',
            expression: `DOC.entriesCount + DOC.reactionsCount + DOC.followsCount`,
        });

export const postsWithActivityScoreMapping = postsMapping
    .addRelations([
        {
            alias: 'reactionsCount',
            edgeCollection: collectionInfos.reactionsCollection.name,
            direction: 'INBOUND',
            count: true,
            cardinality: 'one',
        },
        {
            alias: 'entriesCount',
            edgeCollection: collectionInfos.entriesCollection.name,
            direction: 'INBOUND',
            cardinality: 'one',
            count: true,
        },
    ])
    .addDerivedProperty({
        alias: 'activityScore',
        expression: `DOC.entriesCount + DOC.reactionsCount + DOC.replyCount + DOC.repostCount`,
    });

export const reactionsMapping = map({
    collection: collectionInfos.reactionsCollection.name,
});
export const followsMapping = map({
    collection: collectionInfos.followsCollection.name,
});
export const entriesMapping = map({
    collection: collectionInfos.entriesCollection.name,
});
export const repostsMapping = map({
    collection: collectionInfos.repostCollection.name,
});
