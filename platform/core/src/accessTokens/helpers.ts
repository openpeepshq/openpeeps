import { Database } from "arangojs";
import { literal, traversal } from "@openpeeps/arango-querybuilder";
import { connector } from "../db/helpers";
import { collectionInfos } from "../db";
import { profilesMapping } from "../profiles/mapping";
import { profileAccessTokensRelation } from "./mapping";

export const profileAccessTokenConnector = connector(
    collectionInfos.profilesCollection,
    collectionInfos.accessTokensCollection,
    collectionInfos.profileAccessTokensCollection,
);

export const removeEdgesForAccessToken = async (db: Database, accessTokenId: string) => {
    const edgeName = collectionInfos.profileAccessTokensCollection.name;
    await traversal()
        .start({ _id: `${collectionInfos.accessTokensCollection.name}/${accessTokenId}` })
        .direction("INBOUND")
        .depth(1)
        .vertexName("v")
        .edgeName("e")
        .collections([edgeName])
        .returnExpression(literal(`REMOVE e IN ${edgeName}`))
        .all(db);
};

export const deleteAccessTokensForProfile = async (db: Database, profileId: string) => {
    await profilesMapping.deleteRelations(db, profileId, profileAccessTokensRelation);
};
