import { eq } from 'drizzle-orm';
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
