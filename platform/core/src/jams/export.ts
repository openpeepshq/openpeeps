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
  email: string;
  handle: string;
  joinedAt: string;
};

type JoinRecord = {
  profileId: string;
  createdAt: string;
};

type AttendanceProfile = Pick<
  Profile,
  'type' | 'displayName' | 'handle' | 'guestData'
>;

export const jamAttendanceExportHeaders = [
  'Type',
  'Name',
  'Email',
  'Handle',
  'Joined At',
] as const;

export const jamAttendanceRowFromJoin = (
  join: JoinRecord,
  profile: AttendanceProfile | undefined,
): JamAttendanceExportRow => {
  const isPublic = profile?.type === 'guest';
  return {
    kind: profile ? (isPublic ? 'public' : 'community') : '',
    name: profile?.displayName || (isPublic ? '' : (profile?.handle ?? '')),
    // Community emails aren't here: several accounts can control one profile.
    email: isPublic ? (profile?.guestData?.email ?? '') : '',
    handle: isPublic ? '' : (profile?.handle ?? ''),
    joinedAt: join.createdAt,
  };
};

export const jamAttendanceExportCsv = (
  rows: JamAttendanceExportRow[],
): string =>
  [
    toCsvRow([...jamAttendanceExportHeaders]),
    ...rows.map((row) =>
      toCsvRow([row.kind, row.name, row.email, row.handle, row.joinedAt]),
    ),
  ].join('\n');

const listJamJoinEvents = async (jamId: string): Promise<JoinRecord[]> => {
  const db = await database();
  const rows = await db
    .select({
      createdAt: jamEvents.createdAt,
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
      },
    ];
  });
};

export const exportJamAttendanceCsv = async (
  jamId: string,
): Promise<string> => {
  const joins = await listJamJoinEvents(jamId);
  const profileIds = [...new Set(joins.map((join) => join.profileId))];
  const profiles = profileIds.length ? await getProfiles(profileIds) : [];
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile] as const),
  );

  return jamAttendanceExportCsv(
    joins.map((join) =>
      jamAttendanceRowFromJoin(join, profilesById.get(join.profileId)),
    ),
  );
};
