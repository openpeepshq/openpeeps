import { eq } from 'drizzle-orm';
import { connector } from '../db/helpers';
import type { PgDb } from '../db/pg/client';
import { profileAccessTokens } from '../db/pg/schema/edges';
import { collectionInfos } from '../db';
import { profilesMapping } from '../profiles/mapping';
import { profileAccessTokensRelation } from './mapping';

export const profileAccessTokenConnector = connector(
  collectionInfos.profilesCollection,
  collectionInfos.accessTokensCollection,
  collectionInfos.profileAccessTokensCollection,
);

export const removeEdgesForAccessToken = async (
  db: PgDb,
  accessTokenId: string,
) => {
  await db
    .delete(profileAccessTokens)
    .where(eq(profileAccessTokens.toId, accessTokenId));
};

export const deleteAccessTokensForProfile = async (
  db: PgDb,
  profileId: string,
) => {
  await profilesMapping.deleteRelations(
    db,
    profileId,
    profileAccessTokensRelation,
  );
};
