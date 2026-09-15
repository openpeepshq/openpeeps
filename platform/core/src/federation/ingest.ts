import { and, eq, isNull, sql } from 'drizzle-orm';
import { pgDb } from '../db/pg/client';
import { follows } from '../db/pg/schema/edges';
import { profiles } from '../db/pg/schema/documents';
import { follow, unfollow } from '../profiles/mutations';
import { follows as hasFollow } from '../profiles/finders';
import { recordApActivity } from './activities';
import type { Profile } from '@openpeepshq/common/types';

export const ingestIncomingFollow = async (
  follower: Profile,
  followed: Profile,
  activityUri: string,
) => {
  if (!(await hasFollow(follower, followed))) {
    await follow(follower, followed, {
      uri: activityUri,
      reblogs: true,
      notify: true,
    });
  }
  await recordApActivity({
    uri: activityUri,
    type: 'Follow',
    actorUri: followerUri(follower),
    objectUri: followerUri(followed),
    direction: 'in',
  });
};

export const ingestIncomingUnfollow = async (
  follower: Profile,
  followed: Profile,
  activityUri: string,
) => {
  if (await hasFollow(follower, followed)) {
    await unfollow(follower, followed);
  }
  await recordApActivity({
    uri: activityUri,
    type: 'Undo',
    actorUri: followerUri(follower),
    objectUri: followerUri(followed),
    direction: 'in',
  });
};

const followerUri = (profile: Profile) => {
  const uri = (profile as Profile & { uri?: string }).uri;
  return uri ?? `profile:${profile.id}`;
};

export type FollowerRecipient = {
  uri: string;
  inboxUrl: string;
  sharedInboxUrl: string | null;
};

export const listFederatedFollowerRecipients = async (
  followedId: string,
): Promise<FollowerRecipient[]> => {
  const db = pgDb();
  const rows = await db
    .select({
      uri: profiles.uri,
      inboxUrl: profiles.inboxUrl,
      sharedInboxUrl: profiles.sharedInboxUrl,
    })
    .from(follows)
    .innerJoin(profiles, sql`${follows.fromId} = ${profiles.id}::text`)
    .where(
      and(
        eq(follows.toId, followedId),
        eq(profiles.type, 'federated'),
        isNull(profiles.deletedAt),
      ),
    );
  return rows.flatMap((row) =>
    row.uri && row.inboxUrl
      ? [
          {
            uri: row.uri,
            inboxUrl: row.inboxUrl,
            sharedInboxUrl: row.sharedInboxUrl,
          },
        ]
      : [],
  );
};
