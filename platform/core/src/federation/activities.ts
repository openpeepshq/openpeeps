import { and, eq } from 'drizzle-orm';
import { pgDb } from '../db/pg/client';
import { apActivities } from '../db/pg/schema/documents';

export type ApActivityDirection = 'in' | 'out';

export type ApActivity = {
  uri: string;
  type: string;
  actorUri: string;
  objectUri?: string | null;
  direction: ApActivityDirection;
};

export const recordApActivity = async (activity: ApActivity) => {
  const db = pgDb();
  await db
    .insert(apActivities)
    .values({
      uri: activity.uri,
      type: activity.type,
      actorUri: activity.actorUri,
      objectUri: activity.objectUri ?? null,
      direction: activity.direction,
    })
    .onConflictDoNothing();
};

export const findApActivityByUri = async (uri: string) => {
  const db = pgDb();
  const [row] = await db
    .select()
    .from(apActivities)
    .where(eq(apActivities.uri, uri))
    .limit(1);
  return row;
};

const outboundFollowWhere = (actorUri: string, objectUri: string) =>
  and(
    eq(apActivities.type, 'Follow'),
    eq(apActivities.actorUri, actorUri),
    eq(apActivities.objectUri, objectUri),
    eq(apActivities.direction, 'out'),
  );

/**
 * The outbound Follow activity we currently have live for this (actor,
 * object) pair, if any. `objectUri` is stored as the *target* actor URI for
 * Follow rows (the followee), so this is the idempotency key for outbound
 * follows and the "we followed them" marker for outbound Undos.
 *
 * The row's lifecycle mirrors the follow edge: it is written when we send a
 * Follow and deleted when the edge goes away (`federateUnfollow` after the
 * Undo), so a re-follow after an unfollow must re-send instead of being
 * swallowed by a stale row (#241 review #1).
 */
export const findOutboundFollow = async (
  actorUri: string,
  objectUri: string,
) => {
  const db = pgDb();
  const [row] = await db
    .select()
    .from(apActivities)
    .where(outboundFollowWhere(actorUri, objectUri))
    .limit(1);
  return row;
};

/**
 * Drop the recorded outbound Follow for this (actor, object) pair — the
 * ledger half of a live unfollow, so the pair can be re-followed and re-sent
 * (#241 review #1). Idempotent: deleting nothing is fine.
 */
export const deleteOutboundFollow = async (
  actorUri: string,
  objectUri: string,
) => {
  const db = pgDb();
  await db.delete(apActivities).where(outboundFollowWhere(actorUri, objectUri));
};
