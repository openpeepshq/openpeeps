import {
  Account,
  AuthorizationData,
  FollowData,
  GuestPassRequest,
  Profile,
  ProfileData,
  ProfileWithMeta,
  Role,
  Scope,
} from '@openpeepshq/common/types';
import { profilesMapping } from './mapping';
import { allpeepDb } from '../db';
import {
  followConnector,
  followDisconnector,
  followFinder,
  giveControl,
  roleAssigner,
  roleUnassigner,
} from './helpers';
import { hub } from '../events';
import {
  checkProfileCapabilities,
  isBlockedPair,
  randomString,
} from '@openpeepshq/common/lib';
import { capabilitiesConfig } from '../config';
import { uuidv7 } from 'uuidv7';
import { deleteAccessTokensForProfile } from '../accessTokens/helpers';
import {
  profilesCache,
  getProfile,
  getPublicProfile,
  getLocalProfileByHandle,
  clearProfileCache,
} from './cache';
import { logger } from '../log';
import { revokeAllCalendarFeedTokens } from '../calendarFeedTokens';
import { accountsCache } from '../accounts/cache';
import { assertProfileCapacity } from './capacity';
import {
  deleteBlock,
  dropFollowsBetween,
  insertBlock,
  listBlockingIds,
} from './blocks';
import { localActorScalars } from '../federation/identity';
import { nowIso } from '../db/pg/mappers';
import {
  audience,
  blocks,
  bookmarks,
  entries,
  follows,
  mentions,
  postSeen,
  requestsFollow,
  replyTo,
  repost,
  userGroups,
  hasSeen,
  hasRead,
  postGroups,
  jamRecordings,
  profileHashtags,
  controls,
  accountToPushSubscription,
} from '../db/pg/schema/edges';
import {
  notifications,
  posts,
  profiles,
  pushSubscriptions,
} from '../db/pg/schema/documents';
import { extractStorageIds } from '../media/garbageCollection';
import { enqueueMediaDeletion } from '../media/garbageCollectionJobs';
import { eq, inArray, or, sql } from 'drizzle-orm';
import type { PgDb } from '../db/pg/client';

const deletionLog = logger('app:profiles:deletion');

/** Partial-failure log so a hard delete can be re-run to completion. */
export interface DeletedProfileDeletionRecord {
  profileId: string;
  stage: string;
  at: string;
}

const deletionLedger: DeletedProfileDeletionRecord[] = [];

/** Inspect (and test) the partial-failure records of a hard delete. */
export const listDeletionLedger = (): DeletedProfileDeletionRecord[] =>
  deletionLedger;

const dbDeletionLedger = () => ({
  push: async (record: DeletedProfileDeletionRecord) => {
    deletionLedger.push(record);
  },
});
export const createProfile = async (
  data: ProfileData,
  controllingAccount?: Account,
) => {
  await assertProfileCapacity();
  const db = await allpeepDb().then((db) => db.db);
  const id = uuidv7();
  const domain = data.activityPub?.domain;
  const actor =
    data.type === 'local' && domain ? localActorScalars(id, domain) : {};
  const profile = await profilesMapping.create(db, { ...data, id, ...actor });
  if (controllingAccount) {
    await giveControl(db, controllingAccount, profile);
    await accountsCache.del(controllingAccount.id);
  }
  if (data.type !== 'guest') {
    await hub.emit('profileCreated', profile);
  }
  return profile;
};

export const createGuestProfile = async (guestPassRequest: GuestPassRequest) =>
  createProfile({
    handle: `guest-${randomString(6)}`,
    displayName: guestPassRequest.displayName,
    type: 'guest',
    guestData: {
      email: guestPassRequest.email,
      resource: guestPassRequest.resource,
    },
  });

export const updateProfile = async (
  profileId: string,
  data: Partial<ProfileData>,
) => {
  const db = await allpeepDb().then((db) => db.db);
  await profilesCache.del(profileId);
  if (data.handle) {
    await profilesCache.del(data.handle);
  }
  const updated = await profilesMapping.update(db, profileId, data);
  await clearProfileCache(updated);
  return updated;
};

export const pinPostOnProfile = async (
  profile: Pick<Profile, 'id' | 'handle'>,
  pinnedPostId: string,
) => {
  const updated = await updateProfile(profile.id, { pinnedPostId });
  await clearProfileCache(profile);
  return updated;
};

export const deactivateProfile = async (profileId: string) => {
  const db = await allpeepDb().then((db) => db.db);
  const profileToDeactivate = await getProfile(profileId);
  if (!profileToDeactivate) return undefined;

  const now = nowIso();
  await updateProfile(profileId, {
    deactivatedAt: now,
    deactivatedOriginalHandle: profileToDeactivate.handle,
    deactivatedOriginalDisplayName: profileToDeactivate.displayName,
  } as unknown as Partial<ProfileData>);
  // Soft-delete the row so it leaves public/follow lists while the identity
  // stays recoverable (body.deactivatedAt) — "presence removed, content kept".
  // Hard delete (hardDeleteProfile) is what physically purges the row.
  await profilesMapping.delete(db, profileId);

  await deleteAccessTokensForProfile(db, profileId);
  await Promise.all(
    profileToDeactivate.controllers?.map((account) =>
      accountsCache.del(account.id),
    ) ?? [],
  );

  const deactivated = await getProfile(profileId, true);
  if (deactivated) {
    await clearProfileCache(deactivated);
  }
  await hub.emit('profileDeleted', deactivated);
  return deactivated;
};

/**
 * Steps run by hardDeleteProfile, in order. Each returns the failed stage
 * name, or undefined on success. Kept idempotent so a re-run after a partial
 * failure resumes cleanly.
 */
const hardDeleteStages: {
  name: string;
  run: (db: PgDb, profileId: string) => Promise<void>;
}[] = [
  {
    name: 'notifications',
    run: async (db, profileId) => {
      await db
        .delete(notifications)
        .where(
          or(
            eq(notifications.profileId, profileId),
            sql`(${notifications.body} ->> 'fromProfileId') = ${profileId}`,
          ),
        );
    },
  },
  {
    name: 'accessTokens',
    run: async (db, profileId) => {
      await deleteAccessTokensForProfile(db, profileId);
    },
  },
  {
    name: 'pushSubscriptions',
    run: async (db, profileId) => {
      // push_subscriptions.id is uuid but the edge to_id is text — raw SQL
      // bypasses drizzle's type inference, so cast like the rest of the codebase.
      await db
        .delete(pushSubscriptions)
        .where(
          sql`id::text IN (SELECT to_id FROM ${accountToPushSubscription} WHERE from_id = ${profileId})`,
        );
      await db
        .delete(accountToPushSubscription)
        .where(eq(accountToPushSubscription.fromId, profileId));
    },
  },
  {
    name: 'postsAndMedia',
    run: async (db, profileId) => {
      const created = (await db
        .select({ id: posts.id, body: posts.body })
        .from(posts)
        .where(eq(posts.creatorId, profileId))) as {
        id: string;
        body: unknown;
      }[];

      const storageIds = new Set<string>();
      for (const post of created) {
        for (const storageId of extractStorageIds(JSON.stringify(post.body))) {
          storageIds.add(storageId);
        }
      }
      for (const storageId of storageIds) {
        await enqueueMediaDeletion(storageId);
      }

      const postIds = created.map((post) => post.id);
      if (postIds.length > 0) {
        await db.delete(hasSeen).where(inArray(hasSeen.toId, postIds));
        await db.delete(hasRead).where(inArray(hasRead.toId, postIds));
        await db.delete(postSeen).where(inArray(postSeen.toId, postIds));
        await db.delete(bookmarks).where(inArray(bookmarks.toId, postIds));
        await db.delete(postGroups).where(inArray(postGroups.fromId, postIds));
        await db
          .delete(jamRecordings)
          .where(inArray(jamRecordings.toId, postIds));
        await db.delete(mentions).where(inArray(mentions.fromId, postIds));
        // Also purge posts by *others* that mention the member — those
        // dangling `toId = profileId` edges outlive the deleted profile.
        await db.delete(mentions).where(eq(mentions.toId, profileId));
        await db.delete(audience).where(inArray(audience.fromId, postIds));
        await db
          .delete(replyTo)
          .where(
            or(
              inArray(replyTo.fromId, postIds),
              inArray(replyTo.toId, postIds),
            ),
          );
        await db
          .delete(repost)
          .where(
            or(inArray(repost.fromId, postIds), inArray(repost.toId, postIds)),
          );
        await db.delete(posts).where(eq(posts.creatorId, profileId));
      }
    },
  },
  {
    name: 'dmAudience',
    run: async (db, profileId) => {
      await db.delete(audience).where(eq(audience.toId, profileId));
    },
  },
  {
    name: 'edges',
    run: async (db, profileId) => {
      await Promise.all([
        db.delete(follows).where(eq(follows.fromId, profileId)),
        db.delete(follows).where(eq(follows.toId, profileId)),
        db.delete(blocks).where(eq(blocks.fromId, profileId)),
        db.delete(blocks).where(eq(blocks.toId, profileId)),
        db.delete(requestsFollow).where(eq(requestsFollow.fromId, profileId)),
        db.delete(requestsFollow).where(eq(requestsFollow.toId, profileId)),
        db.delete(userGroups).where(eq(userGroups.fromId, profileId)),
        db.delete(entries).where(eq(entries.fromId, profileId)),
        db.delete(profileHashtags).where(eq(profileHashtags.fromId, profileId)),
      ]);
    },
  },
  {
    name: 'profileRow',
    run: async (db, profileId) => {
      await db.delete(controls).where(eq(controls.toId, profileId));
      await db.delete(profiles).where(eq(profiles.id, profileId));
    },
  },
];

const purgeDeletedMember = async (profileId: string, stage: string) => {
  await dbDeletionLedger().push({
    profileId,
    stage,
    at: nowIso(),
  });
};

export const hardDeleteProfile = async (profileId: string) => {
  const db = await allpeepDb().then((db) => db.db);
  const profileToDelete = await getProfile(profileId, true);
  if (!profileToDelete) return;

  try {
    for (const stage of hardDeleteStages) {
      try {
        await stage.run(db, profileId);
      } catch (err) {
        deletionLog.error(
          { err, profileId, stage: stage.name },
          'hard delete stage failed',
        );
        await purgeDeletedMember(profileId, stage.name);
        throw err;
      }
    }
  } finally {
    await Promise.all(
      profileToDelete.controllers?.map((account) =>
        accountsCache.del(account.id),
      ) ?? [],
    );
    await clearProfileCache(profileToDelete);
  }

  // ICS feed tokens are keyed by profileId without an FK, so profile
  // deletion cannot cascade them — revoke explicitly, mirroring the
  // access-token cleanup above. (Landed on main after this PR branched;
  // folded into the staged hard-delete so it is not lost to the rebase.)
  await revokeAllCalendarFeedTokens(profileId);
  await hub.emit('profileDeleted', profileToDelete);
};

/** Deprecated alias — use `hardDeleteProfile` explicitly. */
export const deleteProfile = hardDeleteProfile;

export const follow = async (
  follower: Profile,
  followed: Profile,
  followData: FollowData,
) => {
  const { db } = await allpeepDb();
  const existing = await followFinder(db, follower, followed);
  if (!existing) {
    await followConnector(db, follower, followed, followData);
    await hub.emit('followCreated', follower, followed);
  }
  await Promise.all([clearProfileCache(follower), clearProfileCache(followed)]);
};

const log = logger('openpeeps:auto-follow');

const adminAllScope: Scope = {
  scopeLevel: 'admin',
  resource: { type: '*', id: '*' },
};

/**
 * Normalizes a configured auto-follow handle: strips a leading `@` and
 * surrounding whitespace. Both the save-time validation (server PATCH
 * backstop) and the follow resolution (auto-follow queue) must use this
 * shared form so the two paths cannot drift apart.
 */
export const normalizeAutoFollowHandle = (rawHandle: string): string =>
  rawHandle.replace(/^@/, '').trim();

/**
 * Whether `follower` may follow `target` under the same rules as
 * `followProfileHandler`. Callers acting on behalf of a request pass the
 * request's `authData` so its scopes are honored; queue callers omit it and
 * are treated like in-app web session tokens (which always carry the
 * `admin * *` scope). Restricted access tokens never reach this path — only
 * `followProfileHandler` carries a token, and it passes the request's
 * `authData` through — so the synthesized-scope shortcut must not be copied
 * onto a token-bearing caller.
 */
export const canFollowProfile = async (
  follower: ProfileWithMeta,
  target: ProfileWithMeta,
  authData?: AuthorizationData,
): Promise<{ success: boolean; missingCapabilities: string[] }> => {
  const { success, missingCapabilities } = checkProfileCapabilities(
    {
      profile: follower,
      scopes: authData?.scopes ?? [adminAllScope],
    },
    ['core-profiles-follow'],
    target,
    await capabilitiesConfig(),
  );
  return { success, missingCapabilities };
};

/**
 * Makes a profile follow the community's designated accounts (community
 * config `content.autoFollow`, by handle). Local, resolvable handles only.
 * Skips the profile itself, blocked pairs, and profiles the follower may
 * not follow; one failing follow never blocks the rest.
 */
export const followDesignatedProfiles = async (
  profile: ProfileWithMeta,
  handles: string[],
) => {
  for (const rawHandle of handles) {
    const handle = normalizeAutoFollowHandle(rawHandle);
    if (!handle || handle === profile.handle) continue;
    try {
      const target = await getLocalProfileByHandle(handle);
      if (!target) {
        log.warn(`auto-follow target not found on this instance: ${handle}`);
        continue;
      }
      if (isBlockedPair(profile, target.id)) {
        log.warn(
          `auto-follow skipped, blocked pair: ${profile.handle} <-> ${handle}`,
        );
        continue;
      }
      const { success, missingCapabilities } = await canFollowProfile(
        profile,
        target,
      );
      if (!success) {
        log.warn(
          `auto-follow skipped, missing capabilities ${missingCapabilities.join(', ')}: ${profile.handle} -> ${handle}`,
        );
        continue;
      }
      await follow(profile, target, { reblogs: true, notify: false });
    } catch (error) {
      log.error(`auto-follow failed for ${handle}`, error);
    }
  }
};

export const unfollow = async (follower: Profile, followed: Profile) => {
  const { db } = await allpeepDb();
  await followDisconnector(db, follower, followed);
  await hub.emit('followDeleted', follower, followed);
  await Promise.all([clearProfileCache(follower), clearProfileCache(followed)]);
};

export const blockProfile = async (blocker: Profile, blocked: Profile) => {
  const { db } = await allpeepDb();
  await insertBlock(db, blocker.id, blocked.id);
  await dropFollowsBetween(db, blocker.id, blocked.id);
  await Promise.all([clearProfileCache(blocker), clearProfileCache(blocked)]);
};

export const unblockProfile = async (blocker: Profile, blocked: Profile) => {
  const { db } = await allpeepDb();
  await deleteBlock(db, blocker.id, blocked.id);
  await Promise.all([clearProfileCache(blocker), clearProfileCache(blocked)]);
};

export const listBlockedProfiles = async (
  profile: Profile,
): Promise<ProfileWithMeta[]> => {
  const { db } = await allpeepDb();
  const ids = await listBlockingIds(db, profile.id);
  const profiles = await Promise.all(ids.map((id) => getPublicProfile(id)));
  return profiles.filter((item): item is ProfileWithMeta => !!item);
};

export const assignRole = (profile: Profile, role: Role) =>
  allpeepDb()
    .then(({ db }) => roleAssigner(db, profile, role))
    .then(() => profilesCache.del(profile.id));

export const unassignRole = (profile: Profile, role: Role) =>
  allpeepDb()
    .then(({ db }) => roleUnassigner(db, profile, role))
    .then(() => profilesCache.del(profile.id));
