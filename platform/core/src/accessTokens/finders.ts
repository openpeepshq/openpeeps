import {
    AccessToken,
    AccessTokenWithMeta,
    authorizationSchema,
    ProfileWithMeta,
    Scope,
} from "@openpeeps/common/types";
import { decodeJwtPayloadUnverified, parseScopesFromJwt } from "@openpeeps/common";
import { allpeepDb } from "../db";
import { getProfile } from "../profiles/cache";
import { profilesMapping } from "../profiles/mapping";
import { accessTokensMapping, profileAccessTokensRelation } from "./mapping";
import { isMaybeRevoked } from "./revokations";

type AccessTokenWithScopes = AccessTokenWithMeta & { scopes?: Scope[] };

export const isServiceAccessToken = (token: AccessToken): boolean => {
    if (!token.signedToken) {
        return false;
    }
    try {
        const payload = decodeJwtPayloadUnverified(token.signedToken);
        const parsed = authorizationSchema.safeParse(payload);
        return parsed.success && !!parsed.data.identities.service;
    } catch {
        return false;
    }
};

const withCachedOwnerAndScopes = async (token: AccessToken): Promise<AccessTokenWithScopes> => {
    const ownerId = token.ownedBy?.id;
    const scopes = parseScopesFromJwt(token.signedToken);
    if (!ownerId) {
        return { ...token, ownedBy: undefined, scopes };
    }
    const owner = await getProfile(ownerId);
    return { ...token, ownedBy: owner, scopes };
};

export const findAccessToken = (id: string): Promise<AccessTokenWithScopes | undefined> =>
    allpeepDb().then(({ db }) => accessTokensMapping.find(db, id).then((t) => (t ? withCachedOwnerAndScopes(t) : undefined)));

export const listAccessTokens = (): Promise<AccessTokenWithScopes[]> =>
    allpeepDb().then(async ({ db }) => {
        const tokens = await accessTokensMapping.all(db);
        return Promise.all(tokens.map(withCachedOwnerAndScopes));
    });

export const listAccessTokensForProfile = (profile: ProfileWithMeta): Promise<AccessTokenWithScopes[]> =>
    allpeepDb().then(async ({ db }) =>
        profilesMapping.relationsFrom(profile, profileAccessTokensRelation).all(db)
            .then(tokens => Promise.all(tokens.map(withCachedOwnerAndScopes))));

export const listServiceAccessTokens = (): Promise<AccessTokenWithScopes[]> =>
    listAccessTokens().then((tokens) => tokens.filter(isServiceAccessToken));

export const isRevoked = async (id: string): Promise<boolean> =>
    (await isMaybeRevoked(id)) && !!(await findAccessToken(id))?.revokedAt;