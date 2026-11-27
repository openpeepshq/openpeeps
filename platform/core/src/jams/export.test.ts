import { describe, expect, it } from 'vitest';
import {
  firstJoinByProfile,
  jamAttendanceExportCsv,
  jamAttendanceExportHeaders,
  jamAttendanceRowFromJoin,
  type JoinRecord,
} from './export';

const guest = {
  type: 'guest' as const,
  displayName: 'Jane Public',
  handle: 'guest-abc123',
};

const member = {
  type: 'local' as const,
  displayName: 'Alex',
  handle: 'alex',
};

describe('jamAttendanceRowFromJoin', () => {
  it('exports public guests with no handle', () => {
    expect(
      jamAttendanceRowFromJoin(
        {
          profileId: 'g1',
          createdAt: '2026-09-17T12:00:00.000Z',
          recurrenceId: '2026-09-17T18:00:00.000Z',
        },
        guest,
      ),
    ).toEqual({
      kind: 'public',
      name: 'Jane Public',
      handle: '',
      joinedAt: '2026-09-17T12:00:00.000Z',
      recurrenceId: '2026-09-17T18:00:00.000Z',
    });
  });

  it('exports community members with handle', () => {
    expect(
      jamAttendanceRowFromJoin(
        {
          profileId: 'm1',
          createdAt: '2026-09-17T12:05:00.000Z',
          recurrenceId: undefined,
        },
        member,
      ),
    ).toEqual({
      kind: 'community',
      name: 'Alex',
      handle: 'alex',
      joinedAt: '2026-09-17T12:05:00.000Z',
      recurrenceId: '',
    });
  });

  it('falls back to handle when a community member has no display name', () => {
    expect(
      jamAttendanceRowFromJoin(
        {
          profileId: 'm1',
          createdAt: '2026-09-17T12:05:00.000Z',
          recurrenceId: undefined,
        },
        { ...member, displayName: undefined },
      ),
    ).toMatchObject({ name: 'alex', handle: 'alex' });
  });

  it('keeps a join row when the profile is missing', () => {
    expect(
      jamAttendanceRowFromJoin(
        {
          profileId: 'gone',
          createdAt: '2026-09-17T12:10:00.000Z',
          recurrenceId: undefined,
        },
        undefined,
      ),
    ).toEqual({
      kind: '',
      name: '',
      handle: '',
      joinedAt: '2026-09-17T12:10:00.000Z',
      recurrenceId: '',
    });
  });
});

describe('firstJoinByProfile', () => {
  const join = (
    profileId: string,
    createdAt: string,
    recurrenceId: string | undefined,
  ): JoinRecord => ({ profileId, createdAt, recurrenceId });

  it('keeps the first join when a profile joins two occurrences of a series', () => {
    const first = join(
      'p1',
      '2026-09-17T18:00:00.000Z',
      '2026-09-17T18:00:00.000Z',
    );
    const later = join(
      'p1',
      '2026-09-24T18:00:00.000Z',
      '2026-09-24T18:00:00.000Z',
    );

    expect(firstJoinByProfile([first, later])).toEqual([first]);
  });

  it('keeps every distinct profile, ordered by first join', () => {
    const a1 = join('a', '2026-09-17T18:00:00.000Z', 'occ-1');
    const b1 = join('b', '2026-09-17T18:01:00.000Z', 'occ-1');
    const a2 = join('a', '2026-09-24T18:00:00.000Z', 'occ-2');
    const c1 = join('c', '2026-09-17T18:05:00.000Z', 'occ-1');

    expect(firstJoinByProfile([a1, b1, a2, c1])).toEqual([a1, b1, c1]);
  });

  it('returns an empty list for no joins', () => {
    expect(firstJoinByProfile([])).toEqual([]);
  });
});

describe('jamAttendanceExportCsv', () => {
  it('keeps explicit rows and escapes commas', () => {
    const csv = jamAttendanceExportCsv([
      jamAttendanceRowFromJoin(
        {
          profileId: 'g1',
          createdAt: '2026-09-17T12:00:00.000Z',
          recurrenceId: '2026-09-17T18:00:00.000Z',
        },
        { ...guest, displayName: 'Public, Jane' },
      ),
      jamAttendanceRowFromJoin(
        {
          profileId: 'm1',
          createdAt: '2026-09-17T12:05:00.000Z',
          recurrenceId: undefined,
        },
        member,
      ),
    ]);

    expect(csv).toBe(
      [
        'Type,Name,Handle,Joined At,Recurrence Id',
        'public,"Public, Jane",,2026-09-17T12:00:00.000Z,2026-09-17T18:00:00.000Z',
        'community,Alex,alex,2026-09-17T12:05:00.000Z,',
      ].join('\n'),
    );
  });

  it('writes exactly the five exported columns as the header', () => {
    const csv = jamAttendanceExportCsv([]);

    // Pin the 5-column contract (the email column was dropped, Recurrence Id
    // added) so a drifted header is caught, not just compared to itself.
    expect(jamAttendanceExportHeaders).toEqual([
      'Type',
      'Name',
      'Handle',
      'Joined At',
      'Recurrence Id',
    ]);
    expect(csv).toBe('Type,Name,Handle,Joined At,Recurrence Id');
    expect(csv.split('\n')).toHaveLength(1);
  });
});
