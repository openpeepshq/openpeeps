import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findJamEvent,
  setJamSpotlight,
  ensureLocalProfile,
  ensureJamModeration,
} = vi.hoisted(() => ({
  findJamEvent: vi.fn(),
  setJamSpotlight: vi.fn(),
  ensureLocalProfile: vi.fn(),
  ensureJamModeration: vi.fn(async () => undefined),
}));

vi.mock('#lib/auth', () => ({
  ensureLocalProfile,
  ensureJamModeration,
}));

vi.mock('@openpeepshq/core/jams', () => ({
  findJamEvent,
  setJamSpotlight,
}));

import { forbidden } from '#lib/errors';
import { apiEndpoint, Input, Output, Param, Query } from '../POST';

const CREATOR_ID = '01970000-0000-7000-8000-000000000001';
const MODERATOR_ID = '01970000-0000-7000-8000-000000000002';
const SPOTLIT_ID = '01970000-0000-7000-8000-000000000003';

// Public jam (visibility 'public' + data.jam) with a co-moderator: the
// endpoint routes every caller through the real host-or-moderator gate
// (`ensureJamModeration`), which lets the creator and co-moderators through
// without any capability.
const jamEvent = () => ({
  id: 'jam-1',
  type: 'post',
  visibility: 'public',
  profile: { id: CREATOR_ID },
  data: {
    type: 'event',
    jam: {
      id: 'jam-1',
      moderators: [CREATOR_ID, MODERATOR_ID],
    },
  },
});

// `endpoint().handle(fn)` returns the merged-input handler, called as
// `handle({ body, query, param, event })` with no schema validation (same
// pattern as remove-participant-POST.test.ts). Only the auth and core jam
// dependencies are mocked; the endpoint's own branch logic and the real
// `parseOccurrenceQuery` run unmocked.
const call = ({
  identity,
  profileId = CREATOR_ID,
  query = {},
}: {
  identity: string | null;
  profileId?: string;
  query?: Record<string, string>;
}) => {
  ensureLocalProfile.mockResolvedValue({ id: profileId });
  return (
    apiEndpoint.handle as (args: Record<string, unknown>) => Promise<unknown>
  )({
    body: { identity },
    query,
    param: { eventId: 'jam-1' },
    event: {},
  });
};

describe('jams spotlight POST endpoint (#2206)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findJamEvent.mockResolvedValue(jamEvent());
    setJamSpotlight.mockResolvedValue({ success: true });
    ensureJamModeration.mockResolvedValue(undefined);
  });

  it('returns 404 for an unknown jam', async () => {
    findJamEvent.mockResolvedValue(undefined);

    await expect(call({ identity: SPOTLIT_ID })).rejects.toMatchObject({
      status: 404,
    });
    expect(setJamSpotlight).not.toHaveBeenCalled();
  });

  it('lets the creator through without a capability check', async () => {
    await expect(call({ identity: SPOTLIT_ID })).resolves.toEqual({
      success: true,
    });
    // The creator fast-path is inside `ensureJamModeration`; the endpoint
    // itself has no capability branch left to call.
    expect(ensureJamModeration).toHaveBeenCalledWith(
      expect.anything(),
      jamEvent(),
    );
    expect(setJamSpotlight).toHaveBeenCalledWith(
      jamEvent(),
      SPOTLIT_ID,
      undefined,
    );
  });

  it('routes a non-creator through the host-or-moderator gate', async () => {
    await expect(
      call({ identity: SPOTLIT_ID, profileId: MODERATOR_ID }),
    ).resolves.toEqual({ success: true });
    expect(ensureJamModeration).toHaveBeenCalledWith(
      expect.anything(),
      jamEvent(),
    );
    expect(setJamSpotlight).toHaveBeenCalledWith(
      jamEvent(),
      SPOTLIT_ID,
      undefined,
    );
  });

  it('rejects with 403 when the gate denies (no host/moderator/capability)', async () => {
    ensureJamModeration.mockRejectedValueOnce(forbidden());

    await expect(
      call({ identity: SPOTLIT_ID, profileId: 'outsider' }),
    ).rejects.toMatchObject({ status: 403 });
    expect(setJamSpotlight).not.toHaveBeenCalled();
  });

  it('threads a valid occurrence query to setJamSpotlight', async () => {
    await expect(
      call({
        identity: SPOTLIT_ID,
        query: { occurrence: '2026-01-15T12:00:00.000Z' },
      }),
    ).resolves.toEqual({ success: true });
    expect(setJamSpotlight).toHaveBeenCalledWith(
      jamEvent(),
      SPOTLIT_ID,
      '2026-01-15T12:00:00.000Z',
    );
  });

  it('passes an unparseable occurrence through as undefined', async () => {
    await expect(
      call({ identity: null, query: { occurrence: 'not-a-date' } }),
    ).resolves.toEqual({ success: true });
    expect(setJamSpotlight).toHaveBeenCalledWith(jamEvent(), null, undefined);
  });

  it('pins the endpoint schemas against drift', () => {
    expect(Input.parse({ identity: SPOTLIT_ID })).toEqual({
      identity: SPOTLIT_ID,
    });
    expect(Input.parse({ identity: null })).toEqual({ identity: null });
    expect(() => Input.parse({ identity: 'not-a-uuid' })).toThrow();
    // Egress/observer identities (`EG_` prefix, minted by
    // `createJamEgressToken`) are not profile UUIDs, so they can never reach
    // this endpoint — loosening the uuid schema is a conscious decision.
    expect(() =>
      Input.parse({ identity: 'EG_01970000-0000-7000-8000-000000000003' }),
    ).toThrow();
    expect(Param.parse({ eventId: 'jam-1' })).toEqual({ eventId: 'jam-1' });
    expect(Query.parse({ occurrence: '2026-01-15T12:00:00.000Z' })).toEqual({
      occurrence: '2026-01-15T12:00:00.000Z',
    });
    expect(Query.parse({})).toEqual({});
    expect(Output.parse({ success: true })).toEqual({ success: true });
    expect(Output.parse({ success: false })).toEqual({ success: false });
    expect(() => Output.parse({ ok: true })).toThrow();
  });
});
