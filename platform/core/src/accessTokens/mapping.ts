import { map } from "@openpeeps/arango-querybuilder";
import { RelationWithMapping } from "@openpeeps/arango-querybuilder/types";
import { AccessToken, AccessTokenData } from "@openpeeps/common/types";
import { collectionInfos } from "../db";
import { baseProfilesMapping } from "../profiles/mapping";

const accessTokensCollection = collectionInfos.accessTokensCollection.name;
const profileAccessTokensEdge = collectionInfos.profileAccessTokensCollection.name;

const accessTokenOwnedByRelation = {
    alias: "ownedBy",
    edgeCollection: profileAccessTokensEdge,
    direction: "INBOUND" as const,
    skipEdge: true,
    cardinality: "one" as const,
    mapping: baseProfilesMapping.data(),
};

export const accessTokensMapping = map<AccessTokenData, AccessToken>({
    collection: accessTokensCollection,
    relations: [accessTokenOwnedByRelation],
});

export const profileAccessTokensRelation: RelationWithMapping<AccessToken> = {
    alias: "accessTokens",
    edgeCollection: profileAccessTokensEdge,
    direction: "OUTBOUND",
    skipEdge: true,
    cardinality: "many",
    mapping: accessTokensMapping.data(),
};
