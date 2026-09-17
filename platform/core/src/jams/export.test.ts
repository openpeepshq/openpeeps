import { describe, expect, it } from 'vitest';
import { jamAttendanceExportCsv, jamAttendanceRowFromJoin } from './export';

const guest = {
  type: 'guest' as const,
  displayName: 'Jane Public',
  handle: 'guest-abc123',
  guestData: { email: 'jane@example.com' },
};

const member = {
  type: 'local' as const,
  displayName: 'Alex',
  handle: 'alex',
  guestData: { email: 'hidden@example.com' },
};

describe('jamAttendanceRowFromJoin', () => {
  it('exports public guests with email and no handle', () => {
    expect(
      jamAttendanceRowFromJoin(
        { profileId: 'g1', createdAt: '2026-09-17T12:00:00.000Z' },
        guest,
      ),
    ).toEqual({
      kind: 'public',
      name: 'Jane Public',
      email: 'jane@example.com',
      handle: '',
      joinedAt: '2026-09-17T12:00:00.000Z',
    });
  });

  it('exports community members with handle and no email', () => {
    expect(
      jamAttendanceRowFromJoin(
        { profileId: 'm1', createdAt: '2026-09-17T12:05:00.000Z' },
        member,
      ),
    ).toEqual({
      kind: 'community',
      name: 'Alex',
      email: '',
      handle: 'alex',
      joinedAt: '2026-09-17T12:05:00.000Z',
    });
  });

  it('falls back to handle when a community member has no display name', () => {
    expect(
      jamAttendanceRowFromJoin(
        { profileId: 'm1', createdAt: '2026-09-17T12:05:00.000Z' },
        { ...member, displayName: undefined },
      ),
    ).toMatchObject({ name: 'alex', handle: 'alex' });
  });

  it('keeps a join row when the profile is missing', () => {
    expect(
      jamAttendanceRowFromJoin(
        { profileId: 'gone', createdAt: '2026-09-17T12:10:00.000Z' },
        undefined,
      ),
    ).toEqual({
      kind: '',
      name: '',
      email: '',
      handle: '',
      joinedAt: '2026-09-17T12:10:00.000Z',
    });
  });
});

describe('jamAttendanceExportCsv', () => {
  it('keeps reconnects as separate rows and escapes commas', () => {
    const csv = jamAttendanceExportCsv([
      jamAttendanceRowFromJoin(
        { profileId: 'g1', createdAt: '2026-09-17T12:00:00.000Z' },
        { ...guest, displayName: 'Public, Jane' },
      ),
      jamAttendanceRowFromJoin(
        { profileId: 'g1', createdAt: '2026-09-17T12:30:00.000Z' },
        { ...guest, displayName: 'Public, Jane' },
      ),
      jamAttendanceRowFromJoin(
        { profileId: 'm1', createdAt: '2026-09-17T12:05:00.000Z' },
        member,
      ),
    ]);

    expect(csv).toBe(
      [
        'Type,Name,Email,Handle,Joined At',
        'public,"Public, Jane",jane@example.com,,2026-09-17T12:00:00.000Z',
        'public,"Public, Jane",jane@example.com,,2026-09-17T12:30:00.000Z',
        'community,Alex,,alex,2026-09-17T12:05:00.000Z',
      ].join('\n'),
    );
  });
});
