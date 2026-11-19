import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/auth', () => ({
  ensureLocalProfile: vi.fn(async () => ({ id: 'host-1' })),
  ensurePostCapabilities: vi.fn(async () => undefined),
}));

const { findJamEvent, removeParticipant } = vi.hoisted(() => ({
  findJamEvent: vi.fn(),
  removeParticipant: vi.fn(async () => undefined),
}));

vi.mock('@openpeepshq/core/jams', () => ({
  findJamEvent,
  removeParticipant,
}));

import { apiEndpoint, Input, Output } from './POST';

const MODERATOR_ID = 'mod-2';
const GUEST_ID = 'guest-3';
const UUID_ID = '01970000-0000-7000-8000-000000000004';

const jamEvent = () => ({
  id: 'jam-1',
  type: 'post',
  visibility: 'public',
  profile: { id: 'host-1' },
  data: {
    type: 'event',
    jam: {
      id: 'jam-1',
      moderators: ['host-1', MODERATOR_ID],
      speakers: [],
      presenters: [],
      audience: 'everyone',
    },
  },
});

// `endpoint().handle(fn)` returns the merged-input handler, called as
// `handle({ body, query, param, event })` with no schema validation (same
// pattern as the admin-analytics-export unit test). Only the auth and jam
// dependencies are mocked; the endpoint's own branch logic and the real
// `canModerateJam` helper run unmocked.
const call = (identity: string) =>
  (apiEndpoint.handle as (args: Record<string, unknown>) => Promise<unknown>)({
    body: { identity },
    query: {},
    param: { eventId: 'jam-1' },
    event: {},
  });

describe('remove-participant endpoint (#303)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findJamEvent.mockResolvedValue(jamEvent());
  });

  it('422s when the target is a jam moderator (a ban would be incoherent)', async () => {
    await expect(call(MODERATOR_ID)).rejects.toMatchObject({
      status: 422,
      message: 'A jam moderator cannot be removed from the jam',
    });
    expect(removeParticipant).not.toHaveBeenCalled();
  });

  it('422s on self-removal before the moderator guard', async () => {
    await expect(call('host-1')).rejects.toMatchObject({
      status: 422,
      message: 'A moderator cannot remove themselves',
    });
    expect(removeParticipant).not.toHaveBeenCalled();
  });

  it('removes a non-moderator participant', async () => {
    await expect(call(GUEST_ID)).resolves.toEqual({ success: true });
    expect(removeParticipant).toHaveBeenCalledWith(
      expect.anything(),
      GUEST_ID,
      undefined,
    );
  });

  it('pins the endpoint contract against schema drift', () => {
    // The client's `removeParticipant` is typed `SuccessResponse` with body
    // `{ identity }`; a rename in `common` must break here, not silently.
    expect(() => Input.parse({ identity: UUID_ID })).not.toThrow();
    expect(Input.parse({ identity: UUID_ID })).toEqual({ identity: UUID_ID });
    expect(() => Input.parse({ identity: 'not-a-uuid' })).toThrow();
    expect(() => Output.parse({ success: true })).not.toThrow();
    expect(() => Output.parse({ ok: true })).toThrow();
  });
});
