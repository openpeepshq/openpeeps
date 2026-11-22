import { beforeEach, describe, expect, it, vi } from 'vitest';

// The caller identity the endpoint's `ensureLocalProfile` returns; the test
// mutates it per case (host vs. a co-moderator). Set inside the hoisted
// factory so the mock stays untyped — the real `ensureLocalProfile` resolves
// a full Profile, which we only read `.id` off.
const caller = vi.hoisted(() => ({ current: 'host-1' }));

vi.mock('#lib/auth', () => ({
  ensureLocalProfile: vi.fn(async () => ({ id: caller.current })),
  ensureJamModeration: vi.fn(async () => undefined),
}));

const { findJamEvent, liftJamBan } = vi.hoisted(() => ({
  findJamEvent: vi.fn(),
  liftJamBan: vi.fn(async () => undefined),
}));

vi.mock('@openpeepshq/core/jams', () => ({
  findJamEvent,
  liftJamBan,
}));

import { ensureJamModeration } from '#lib/auth';
import { forbidden } from '#lib/errors';
import {
  apiEndpoint,
  Param,
  Output,
  Error,
} from '../../api/openpeeps/core/v1/jams/[eventId]/bans/[profileId]/DELETE';

const HOST_ID = 'host-1';
const MODERATOR_ID = 'mod-2';
const BANNED_ID = 'banned-3';
const UUID_ID = '01970000-0000-7000-8000-000000000004';

const jamEvent = () => ({
  id: 'jam-1',
  type: 'post',
  visibility: 'public',
  profile: { id: HOST_ID },
  data: {
    type: 'event',
    jam: {
      id: 'jam-1',
      moderators: [HOST_ID, MODERATOR_ID],
      speakers: [],
      presenters: [],
      audience: 'everyone',
    },
  },
});

// `endpoint().handle(fn)` returns the merged-input handler, called as
// `handle({ body, query, param, event })` with no schema validation (same
// pattern as the remove-participant unit test). Only the auth and core jam
// dependencies are mocked; the endpoint's own branch logic (host-or-moderator
// gate, 404) and the real `#lib/errors` factories run unmocked.
const call = (callerId: string) => {
  caller.current = callerId;
  return (
    apiEndpoint.handle as (args: Record<string, unknown>) => Promise<unknown>
  )({
    body: undefined,
    query: undefined,
    param: { eventId: 'jam-1', profileId: BANNED_ID },
    event: {},
  });
};

describe('lift-ban endpoint (#303, DELETE /jams/:eventId/bans/:profileId)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findJamEvent.mockResolvedValue(jamEvent());
    vi.mocked(ensureJamModeration).mockResolvedValue(undefined);
  });

  it('404s when the jam does not exist (before the auth gate)', async () => {
    findJamEvent.mockResolvedValueOnce(null);
    await expect(call(MODERATOR_ID)).rejects.toMatchObject({
      status: 404,
      message: 'Jam with id jam-1 not found',
    });
    expect(liftJamBan).not.toHaveBeenCalled();
  });

  it('lets the host lift a ban (the host-or-moderator gate is always exercised)', async () => {
    await expect(call(HOST_ID)).resolves.toEqual({ success: true });
    expect(ensureJamModeration).toHaveBeenCalledWith(
      expect.anything(),
      jamEvent(),
    );
    expect(liftJamBan).toHaveBeenCalledWith(jamEvent(), BANNED_ID);
  });

  it('lets a caller who passes the host-or-moderator gate lift a ban', async () => {
    await expect(call(MODERATOR_ID)).resolves.toEqual({ success: true });
    expect(ensureJamModeration).toHaveBeenCalledWith(
      expect.anything(),
      jamEvent(),
    );
    expect(liftJamBan).toHaveBeenCalledWith(jamEvent(), BANNED_ID);
  });

  it('403s when the caller is neither host, co-moderator, nor core-posts-jam-moderate holder', async () => {
    vi.mocked(ensureJamModeration).mockRejectedValueOnce(forbidden());
    await expect(call(MODERATOR_ID)).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
    });
    expect(liftJamBan).not.toHaveBeenCalled();
  });

  it('pins the endpoint contract against schema drift', () => {
    // A rename in the Param shape (eventId, uuid profileId) or the success
    // output must break here, not silently.
    expect(() =>
      Param.parse({ eventId: 'jam-1', profileId: UUID_ID }),
    ).not.toThrow();
    expect(Param.parse({ eventId: 'jam-1', profileId: UUID_ID })).toEqual({
      eventId: 'jam-1',
      profileId: UUID_ID,
    });
    expect(() => Param.parse({ profileId: UUID_ID })).toThrow();
    expect(() =>
      Param.parse({ eventId: 'jam-1', profileId: 'not-a-uuid' }),
    ).toThrow();
    expect(() => Output.parse({ success: true })).not.toThrow();
    expect(() => Output.parse({ ok: true })).toThrow();
  });

  it('exposes the 404/403 error contracts in the endpoint table', () => {
    expect(Error).toMatchObject({
      404: { status: 404 },
      403: { status: 403 },
    });
  });
});
