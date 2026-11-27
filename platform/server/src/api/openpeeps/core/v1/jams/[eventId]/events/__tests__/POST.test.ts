import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@riddl/core';
import { occurrenceForJamStart } from '@openpeepshq/common/lib';
import type { Event, JamEventData } from '@openpeepshq/common/types';

// Only the external boundaries — auth and the DB-backed jam lookups — are
// mocked; the handler's own branches (self-reported-attendance gate, the
// foreign-id rejection, and the participant-membership gate for chat/react)
// run unmocked. A full Playwright run against a live Postgres is out of scope
// for the unit suite.
const {
  ensureProfileOrGuest,
  findJamEvent,
  createJamEvent,
  listParticipantIds,
} = vi.hoisted(() => ({
  ensureProfileOrGuest: vi.fn(),
  findJamEvent: vi.fn(),
  createJamEvent: vi.fn(),
  listParticipantIds: vi.fn(),
}));

vi.mock('#lib/auth', () => ({ ensureProfileOrGuest }));
vi.mock('@openpeepshq/core/jams', () => ({
  findJamEvent,
  createJamEvent,
  listParticipantIds,
}));

import { apiEndpoint } from '../POST';

const actor = { id: 'actor-1' };
const jamEvent = { id: 'jam-1' } as never;
const event = {} as RequestEvent;

const call = (
  input: Omit<JamEventData, 'jamId'>,
  participants: string[] = [],
) => {
  vi.mocked(listParticipantIds).mockResolvedValue(participants);
  return apiEndpoint.handle({
    body: input,
    query: {},
    param: { eventId: 'jam-1' },
    event,
  });
};

const join = (profileId: string): Omit<JamEventData, 'jamId'> => ({
  id: 'evt-1',
  type: 'join',
  profileId,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findJamEvent).mockResolvedValue(jamEvent);
  vi.mocked(ensureProfileOrGuest).mockResolvedValue(actor as never);
});

describe('POST /jams/[eventId]/events — attendance is self-reported', () => {
  it('normalizes the join profileId to the authenticated actor', async () => {
    const persisted = { id: 'evt-1' };
    vi.mocked(createJamEvent).mockResolvedValue(persisted);

    await expect(call(join('actor-1'))).resolves.toEqual(persisted);
    // The persisted fact is the one the rollup counts: the actor's id, not the
    // client's (identical here, but the handler must still set it).
    expect(createJamEvent).toHaveBeenCalledTimes(1);
    const written = vi.mocked(createJamEvent).mock.calls[0][0];
    expect(written.profileId).toBe('actor-1');
    expect(written.type).toBe('join');
    expect(written.jamId).toBe('jam-1');
  });

  it('rejects a join minted for someone else with 403', async () => {
    await expect(call(join('someone-else'))).rejects.toMatchObject({
      status: 403,
    });
    expect(createJamEvent).not.toHaveBeenCalled();
  });

  it('normalizes the leave profileId to the authenticated actor', async () => {
    const persisted = { id: 'evt-2' };
    vi.mocked(createJamEvent).mockResolvedValue(persisted);

    await expect(
      call({ id: 'evt-2', type: 'leave', profileId: 'actor-1' }),
    ).resolves.toEqual(persisted);
    expect(vi.mocked(createJamEvent).mock.calls[0][0].profileId).toBe(
      'actor-1',
    );
  });

  it('returns 404 when the jam event does not exist', async () => {
    vi.mocked(findJamEvent).mockResolvedValue(null);

    await expect(call(join('actor-1'))).rejects.toMatchObject({
      status: 404,
    });
    expect(ensureProfileOrGuest).not.toHaveBeenCalled();
    expect(createJamEvent).not.toHaveBeenCalled();
  });
});

describe('POST /jams/[eventId]/events — chat/reactions need room membership', () => {
  it('rejects a chat event from a non-participant with 403', async () => {
    await expect(
      call(
        { id: 'evt-3', type: 'message', profileId: 'actor-1', content: 'hi' },
        ['other-1'],
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(createJamEvent).not.toHaveBeenCalled();
    // The membership gate runs before any write.
    expect(listParticipantIds).toHaveBeenCalledWith('jam-1');
  });

  it('accepts a chat event from a participant', async () => {
    const persisted = { id: 'evt-4' };
    vi.mocked(createJamEvent).mockResolvedValue(persisted);

    await expect(
      call(
        { id: 'evt-4', type: 'message', profileId: 'actor-1', content: 'hi' },
        ['actor-1', 'other-1'],
      ),
    ).resolves.toEqual(persisted);
    expect(createJamEvent).toHaveBeenCalledTimes(1);
  });
});

describe('POST /jams/[eventId]/events — server-only event types are rejected', () => {
  it.each(['start', 'close', 'kicked', 'recordStop', 'streamStart'])(
    'rejects a %s event from a participant with 403',
    async (type) => {
      await expect(
        call(
          {
            id: 'evt-5',
            type: type as JamEventData['type'],
            profileId: 'actor-1',
          },
          ['actor-1'],
        ),
      ).rejects.toMatchObject({ status: 403 });
      // The lifecycle row is the one the analytics rollup counts (a `start`
      // mints a session); it must never be persisted through this endpoint.
      expect(createJamEvent).not.toHaveBeenCalled();
    },
  );
});

describe('POST /jams/[eventId]/events — profileId is normalized for every type', () => {
  it('rejects a chat event attributed to someone else with 403', async () => {
    await expect(
      call(
        {
          id: 'evt-6',
          type: 'message',
          profileId: 'someone-else',
          content: 'hi',
        },
        ['actor-1'],
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(createJamEvent).not.toHaveBeenCalled();
  });

  it('rejects a reaction attributed to someone else with 403', async () => {
    await expect(
      call(
        {
          id: 'evt-7',
          type: 'reaction',
          profileId: 'someone-else',
          reaction: '👍',
        },
        ['actor-1'],
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(createJamEvent).not.toHaveBeenCalled();
  });

  it('normalizes a participant chat event to the authenticated actor', async () => {
    vi.mocked(createJamEvent).mockResolvedValue({ id: 'evt-8' });

    await expect(
      call(
        {
          id: 'evt-8',
          type: 'message',
          profileId: 'actor-1',
          content: 'hi',
        },
        ['actor-1'],
      ),
    ).resolves.toEqual({ id: 'evt-8' });
    const written = vi.mocked(createJamEvent).mock.calls[0][0];
    expect(written.profileId).toBe('actor-1');
    expect(written.content).toBe('hi');
  });

  it('normalizes a participant reaction to the authenticated actor', async () => {
    vi.mocked(createJamEvent).mockResolvedValue({ id: 'evt-9' });

    await expect(
      call(
        { id: 'evt-9', type: 'reaction', profileId: 'actor-1', reaction: '👍' },
        ['actor-1'],
      ),
    ).resolves.toEqual({ id: 'evt-9' });
    const written = vi.mocked(createJamEvent).mock.calls[0][0];
    expect(written.profileId).toBe('actor-1');
    expect(written.reaction).toBe('👍');
  });
});

describe('POST /jams/[eventId]/events — attendance is stamped with the occurrence', () => {
  const recurringData: Event = {
    id: 'evt-post',
    profileId: 'host',
    type: 'event',
    title: 'Weekly jam',
    body: '',
    start: '2026-10-01T06:00:00.000Z',
    end: '2026-10-01T07:00:00.000Z',
    wholeDay: false,
    recurrence: { freq: 'WEEKLY' },
    jam: { id: 'jam-1' },
  } as unknown as Event;
  const oneOffData: Event = {
    id: 'evt-post',
    profileId: 'host',
    type: 'event',
    title: 'One-off jam',
    body: '',
    start: '2026-10-01T06:00:00.000Z',
    end: '2026-10-01T07:00:00.000Z',
    wholeDay: false,
    jam: { id: 'jam-1' },
  } as unknown as Event;
  const now = new Date('2026-10-01T06:30:00.000Z');

  beforeEach(() => {
    // The handler resolves the open occurrence at the wall-clock `now`; pin it
    // so the expected id is stable, and let the same (unmocked) resolver
    // compute it so the test asserts parity, not a hard-coded timestamp.
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.mocked(createJamEvent).mockResolvedValue({ id: 'evt-1' });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stamps a join on a recurring jam with the occurrence open at join time', async () => {
    const post = { id: 'jam-1', data: recurringData };
    vi.mocked(findJamEvent).mockResolvedValue(post as never);

    await expect(call(join('actor-1'))).resolves.toEqual({ id: 'evt-1' });
    const expected = occurrenceForJamStart(recurringData, {
      at: now,
    })?.recurrenceId;
    expect(expected).toBeDefined();
    expect(vi.mocked(createJamEvent).mock.calls[0][0].recurrenceId).toBe(
      expected,
    );
  });

  it('stamps a leave on a recurring jam with the same occurrence', async () => {
    const post = { id: 'jam-1', data: recurringData };
    vi.mocked(findJamEvent).mockResolvedValue(post as never);

    await expect(
      call({ id: 'evt-2', type: 'leave', profileId: 'actor-1' }),
    ).resolves.toEqual({ id: 'evt-1' });
    const expected = occurrenceForJamStart(recurringData, {
      at: now,
    })?.recurrenceId;
    expect(vi.mocked(createJamEvent).mock.calls[0][0].recurrenceId).toBe(
      expected,
    );
  });

  it('leaves a one-off jam join occurrence-less (no schedule to resolve)', async () => {
    const post = { id: 'jam-1', data: oneOffData };
    vi.mocked(findJamEvent).mockResolvedValue(post as never);

    await expect(call(join('actor-1'))).resolves.toEqual({ id: 'evt-1' });
    expect(
      vi.mocked(createJamEvent).mock.calls[0][0].recurrenceId,
    ).toBeUndefined();
  });

  it('does not stamp occurrence on non-attendance types', async () => {
    const post = { id: 'jam-1', data: recurringData };
    vi.mocked(findJamEvent).mockResolvedValue(post as never);

    await expect(
      call(
        { id: 'evt-6', type: 'message', profileId: 'actor-1', content: 'hi' },
        ['actor-1'],
      ),
    ).resolves.toEqual({ id: 'evt-1' });
    expect(
      vi.mocked(createJamEvent).mock.calls[0][0].recurrenceId,
    ).toBeUndefined();
  });
});
