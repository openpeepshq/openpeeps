import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  calculateEffectiveRsvps,
  effectiveEventTimes,
  eventRsvpOpen,
  occurrenceHasEnded,
  profileName,
  toCsvRow,
} from '@openpeepshq/common/lib';
import type {
  Event,
  PublicPost,
  PublicRsvp,
  RsvpResponse,
} from '@openpeepshq/common/types';
import { database } from '../db';
import { accounts, controls, profiles } from '../db/pg/schema';
import { listJamAttendeeProfileIds } from '../jams/export';

export type RsvpAttendanceLabel = 'attended' | 'registered' | 'no-show' | '';

const attending = (response: RsvpResponse) =>
  response === 'yes' || response === 'tentative';

/**
 * Join records are the attendance log. Until someone has joined, the column
 * stays off so a jam that has not started is not full of invented no-shows.
 */
export const rsvpAttendanceLabel = (input: {
  response: RsvpResponse;
  attended: boolean;
  eventEnded: boolean;
}): RsvpAttendanceLabel => {
  if (!attending(input.response)) return '';
  if (input.attended) return 'attended';
  return input.eventEnded ? 'no-show' : 'registered';
};

/**
 * Member email lives on the controlling account, and more than one account
 * can control a profile. Guests store the address they typed on the profile.
 */
export const rsvpContactEmail = (input: {
  profileType: string | undefined;
  guestEmail: string;
  accountEmails: readonly string[];
}): string => {
  const accountsJoined = [
    ...new Set(input.accountEmails.filter((email) => email.length > 0)),
  ]
    .sort()
    .join('; ');
  if (input.profileType === 'guest') {
    return input.guestEmail || accountsJoined;
  }
  return accountsJoined;
};

export const rsvpExportEventEnded = (
  event: Event,
  occurrenceId: string | undefined,
  now: Date,
): boolean => {
  if (occurrenceId) {
    const times = effectiveEventTimes(event, occurrenceId);
    return occurrenceHasEnded(times.start, times.end, now);
  }
  if (event.recurrence) return !eventRsvpOpen(event, { now });
  return occurrenceHasEnded(event.start, event.end, now);
};

export type RsvpExportRow = {
  name: string;
  email: string;
  status: RsvpResponse;
  rsvpAt: string;
  memberId: string;
  occurrence: string;
  attendance: RsvpAttendanceLabel;
};

type RsvpExportColumns = {
  includeOccurrence: boolean;
  includeAttendance: boolean;
};

const rsvpExportHeaders = (columns: RsvpExportColumns): string[] => [
  'Name',
  'Email',
  'RSVP Status',
  'RSVP At',
  'Member ID',
  ...(columns.includeOccurrence ? ['Occurrence'] : []),
  ...(columns.includeAttendance ? ['Attendance'] : []),
];

export const rsvpExportCsv = (
  rows: RsvpExportRow[],
  columns: RsvpExportColumns,
): string =>
  [
    toCsvRow(rsvpExportHeaders(columns)),
    ...rows.map((row) =>
      toCsvRow([
        row.name,
        row.email,
        row.status,
        row.rsvpAt,
        row.memberId,
        ...(columns.includeOccurrence ? [row.occurrence] : []),
        ...(columns.includeAttendance ? [row.attendance] : []),
      ]),
    ),
  ].join('\n');

const compareRows = (a: RsvpExportRow, b: RsvpExportRow) => {
  const byOccurrence = a.occurrence.localeCompare(b.occurrence);
  if (byOccurrence !== 0) return byOccurrence;
  const byName = a.name.localeCompare(b.name);
  if (byName !== 0) return byName;
  return a.rsvpAt.localeCompare(b.rsvpAt);
};

export const assembleRsvpExportCsv = (input: {
  post: PublicPost;
  occurrenceId?: string;
  emailsByProfileId: ReadonlyMap<string, string>;
  attendeeIds?: ReadonlySet<string>;
  now?: Date;
}): string => {
  const event = input.post.data?.type === 'event' ? input.post.data : undefined;
  if (!event) {
    return rsvpExportCsv([], {
      includeOccurrence: false,
      includeAttendance: false,
    });
  }

  const now = input.now ?? new Date();
  const includeAttendance = (input.attendeeIds?.size ?? 0) > 0;
  const eventEnded = rsvpExportEventEnded(event, input.occurrenceId, now);
  const rows = calculateEffectiveRsvps(input.post, input.occurrenceId)
    .map((rsvp) => rowFromRsvp(rsvp, input, includeAttendance, eventEnded))
    .sort(compareRows);

  return rsvpExportCsv(rows, {
    includeOccurrence: !!event.recurrence,
    includeAttendance,
  });
};

const rowFromRsvp = (
  rsvp: PublicRsvp,
  input: {
    occurrenceId?: string;
    emailsByProfileId: ReadonlyMap<string, string>;
    attendeeIds?: ReadonlySet<string>;
  },
  includeAttendance: boolean,
  eventEnded: boolean,
): RsvpExportRow => ({
  name: profileName(rsvp.profile) ?? '',
  email: input.emailsByProfileId.get(rsvp.profile.id) ?? '',
  status: rsvp.response,
  rsvpAt: rsvp.createdAt,
  memberId: rsvp.profile.id,
  occurrence: input.occurrenceId ?? rsvp.recurrenceId ?? '',
  attendance:
    includeAttendance && input.attendeeIds
      ? rsvpAttendanceLabel({
          response: rsvp.response,
          attended: input.attendeeIds.has(rsvp.profile.id),
          eventEnded,
        })
      : '',
});

const guestEmailFromBody = (body: unknown): string => {
  if (!body || typeof body !== 'object') return '';
  const email = (body as { guestData?: { email?: unknown } }).guestData?.email;
  return typeof email === 'string' ? email : '';
};

const listRsvpContactEmails = async (
  profileIds: string[],
): Promise<Map<string, string>> => {
  const emails = new Map<string, string>();
  if (!profileIds.length) return emails;

  const db = await database();
  const [profileRows, accountRows] = await Promise.all([
    db
      .select({
        id: profiles.id,
        type: profiles.type,
        body: profiles.body,
      })
      .from(profiles)
      .where(inArray(profiles.id, profileIds)),
    db
      .select({
        profileId: controls.toId,
        email: accounts.email,
      })
      .from(controls)
      .innerJoin(accounts, eq(controls.fromId, sql`${accounts.id}::text`))
      .where(
        and(inArray(controls.toId, profileIds), isNull(accounts.deletedAt)),
      ),
  ]);

  const accountsByProfile = new Map<string, string[]>();
  for (const row of accountRows) {
    const current = accountsByProfile.get(row.profileId) ?? [];
    accountsByProfile.set(row.profileId, [...current, row.email]);
  }

  const seen = new Set<string>();
  for (const row of profileRows) {
    seen.add(row.id);
    emails.set(
      row.id,
      rsvpContactEmail({
        profileType: row.type,
        guestEmail: guestEmailFromBody(row.body),
        accountEmails: accountsByProfile.get(row.id) ?? [],
      }),
    );
  }

  for (const profileId of profileIds) {
    if (seen.has(profileId)) continue;
    emails.set(
      profileId,
      rsvpContactEmail({
        profileType: undefined,
        guestEmail: '',
        accountEmails: accountsByProfile.get(profileId) ?? [],
      }),
    );
  }

  return emails;
};

export const exportEventRsvpsCsv = async (
  post: PublicPost,
  options?: { occurrenceId?: string; now?: Date },
): Promise<string> => {
  const event = post.data?.type === 'event' ? post.data : undefined;
  const profileIds = [
    ...new Set(
      calculateEffectiveRsvps(post, options?.occurrenceId).map(
        (rsvp) => rsvp.profile.id,
      ),
    ),
  ];
  const [emailsByProfileId, attendeeIds] = await Promise.all([
    listRsvpContactEmails(profileIds),
    event?.jam
      ? listJamAttendeeProfileIds(post.id)
      : Promise.resolve([] as string[]),
  ]);

  return assembleRsvpExportCsv({
    post,
    occurrenceId: options?.occurrenceId,
    emailsByProfileId,
    attendeeIds: attendeeIds.length ? new Set(attendeeIds) : undefined,
    now: options?.now,
  });
};
