import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { toCsvRow } from '@openpeepshq/common/lib';
import type { Profile } from '@openpeepshq/common/types';
import { database } from '../db';
import { jamEvents } from '../db/pg/schema';
import { normalizeIsoDatetime } from '../db/pg/mappers';
import { getProfiles } from '../profiles';

export type JamAttendanceKind = 'community' | 'public';

export type JamAttendanceExportRow = {
  kind: JamAttendanceKind | '';
  name: string;
  handle: string;
  joinedAt: string;
  recurrenceId: string;
};

export type JoinRecord = {
  profileId: string;
  createdAt: string;
  recurrenceId: string | undefined;
};

type AttendanceProfile = Pick<Profile, 'type' | 'displayName' | 'handle'>;

export const jamAttendanceExportHeaders = [
  'Type',
  'Name',
  'Handle',
  'Joined At',
  'Recurrence Id',
] as const;

/**
 * Build one attendance row from a join event. The export carries no email
 * column at all: community profiles can be controlled by multiple accounts
 * (no single email is representative) and guest emails are personal data
 * that must not leak into an attendance export.
 */
export const jamAttendanceRowFromJoin = (
  join: JoinRecord,
  profile: AttendanceProfile | undefined,
): JamAttendanceExportRow => {
  const isPublic = profile?.type === 'guest';
  return {
    kind: profile ? (isPublic ? 'public' : 'community') : '',
    name: profile?.displayName || (isPublic ? '' : (profile?.handle ?? '')),
    handle: isPublic ? '' : (profile?.handle ?? ''),
    joinedAt: join.createdAt,
    recurrenceId: join.recurrenceId ?? '',
  };
};

export const jamAttendanceExportCsv = (
  rows: JamAttendanceExportRow[],
): string =>
  [
    toCsvRow([...jamAttendanceExportHeaders]),
    ...rows.map((row) =>
      toCsvRow([
        row.kind,
        row.name,
        row.handle,
        row.joinedAt,
        row.recurrenceId,
      ]),
    ),
  ].join('\n');

const listJamJoinEvents = async (jamId: string): Promise<JoinRecord[]> => {
  const db = await database();
  const rows = await db
    .select({
      createdAt: jamEvents.createdAt,
      recurrenceId: jamEvents.recurrenceId,
      body: jamEvents.body,
    })
    .from(jamEvents)
    .where(
      and(
        eq(jamEvents.postId, jamId),
        isNull(jamEvents.deletedAt),
        sql`${jamEvents.body}->>'type' = 'join'`,
      ),
    )
    .orderBy(asc(jamEvents.createdAt), asc(jamEvents.id));

  return rows.flatMap((row) => {
    const profileId = (row.body as { profileId?: unknown } | null)?.profileId;
    if (typeof profileId !== 'string' || !profileId) {
      return [];
    }
    return [
      {
        profileId,
        createdAt: normalizeIsoDatetime(row.createdAt),
        recurrenceId: row.recurrenceId ?? undefined,
      },
    ];
  });
};

/** Profiles that joined the jam room. Recurring jams share one room. */
export const listJamAttendeeProfileIds = async (
  jamId: string,
): Promise<string[]> => {
  const joins = await listJamJoinEvents(jamId);
  return [...new Set(joins.map((join) => join.profileId))];
};

/**
 * One row per person: keep each profile's first join, in first-join order.
 * Recurring jams share one room, so the same person rejoining a later
 * occurrence must not produce a second row.
 */
export const firstJoinByProfile = (joins: JoinRecord[]): JoinRecord[] => {
  const seen = new Set<string>();
  const firstJoins: JoinRecord[] = [];
  for (const join of joins) {
    if (!seen.has(join.profileId)) {
      seen.add(join.profileId);
      firstJoins.push(join);
    }
  }
  return firstJoins;
};

export const exportJamAttendanceCsv = async (
  jamId: string,
): Promise<string> => {
  const joins = await listJamJoinEvents(jamId);
  const firstJoins = firstJoinByProfile(joins);
  const profileIds = firstJoins.map((join) => join.profileId);
  const profiles = profileIds.length ? await getProfiles(profileIds) : [];
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile] as const),
  );

  return jamAttendanceExportCsv(
    firstJoins.map((join) =>
      jamAttendanceRowFromJoin(join, profilesById.get(join.profileId)),
    ),
  );
};
