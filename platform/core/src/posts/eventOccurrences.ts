import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { Event } from '@openpeepshq/common/types';
import { occurrencesForIndex } from '@openpeepshq/common/lib';
import { database } from '../db';
import { eventOccurrences, posts } from '../db/pg/schema';

export const rebuildEventOccurrences = async (
  postId: string,
  event: Event,
): Promise<void> => {
  const db = await database();
  await db.delete(eventOccurrences).where(eq(eventOccurrences.postId, postId));
  const rows = occurrencesForIndex(event);
  if (rows.length === 0) return;
  await db.insert(eventOccurrences).values(
    rows.map((row) => ({
      id: uuidv7(),
      postId,
      recurrenceId: row.recurrenceId,
      start: row.start,
      end: row.end,
      cancelled: row.cancelled,
    })),
  );
};

export const clearEventOccurrences = async (postId: string): Promise<void> => {
  const db = await database();
  await db.delete(eventOccurrences).where(eq(eventOccurrences.postId, postId));
};

/**
 * JSONL restores bring posts back without `event_occurrences`. The agenda
 * reads only that index, so a restored community would show no events until
 * each one is edited. Recurring series are rebuilt by the daily job.
 */
export const backfillMissingEventOccurrences = async (): Promise<number> => {
  const db = await database();
  const rows = await db
    .select({ id: posts.id, body: posts.body })
    .from(posts)
    .where(
      and(
        eq(posts.type, 'event'),
        isNull(posts.deletedAt),
        sql`NOT EXISTS (SELECT 1 FROM ${eventOccurrences} WHERE ${eventOccurrences.postId} = ${posts.id})`,
      ),
    );

  let rebuilt = 0;
  for (const row of rows) {
    const event = row.body as Event;
    if (event?.type !== 'event' || !event.start) continue;
    await rebuildEventOccurrences(row.id, event);
    rebuilt += 1;
  }
  return rebuilt;
};

export const rebuildRecurringEventOccurrences = async (): Promise<number> => {
  const db = await database();
  const rows = await db
    .select({ id: posts.id, body: posts.body })
    .from(posts)
    .where(
      and(
        eq(posts.type, 'event'),
        isNull(posts.deletedAt),
        isNotNull(sql`${posts.body}->'recurrence'`),
      ),
    );

  let rebuilt = 0;
  for (const row of rows) {
    const event = row.body as Event;
    if (event?.type !== 'event' || !event.start) continue;
    await rebuildEventOccurrences(row.id, event);
    rebuilt += 1;
  }
  return rebuilt;
};
