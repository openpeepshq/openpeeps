import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta } from '@openpeepshq/common/types';
import { deleteJamEvent, findJamEvent } from '@openpeepshq/core/jams';
import { ensureProfileOrGuest } from '#lib/auth';
import { apiEndpoint } from '../DELETE';

vi.mock('#lib/auth', () => ({
  ensureProfileOrGuest: vi.fn(),
}));

vi.mock('@openpeepshq/core/jams', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openpeepshq/core/jams')>();
  return {
    ...actual,
    findJamEvent: vi.fn(),
    deleteJamEvent: vi.fn(),
  };
});

const jamPost = {
  id: 'jamevent',
  profile: { id: 'host' },
  data: { type: 'event', jam: { moderators: ['mod'] } },
} as unknown as PostWithMeta;

const dispatch = (profileId: string) => {
  vi.mocked(ensureProfileOrGuest).mockResolvedValue({ id: profileId } as never);
  return apiEndpoint.handle({
    body: {},
    query: {},
    param: { eventId: 'jamevent', eventJamEventId: 'evt-1' },
    event: {},
  } as never);
};

describe('jams events DELETE route (issue #1587)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for an unknown jam and does not touch deleteJamEvent', async () => {
    vi.mocked(findJamEvent).mockResolvedValue(undefined);
    vi.mocked(ensureProfileOrGuest).mockResolvedValue({ id: 'host' } as never);

    await expect(
      apiEndpoint.handle({
        body: {},
        query: {},
        param: { eventId: 'nope', eventJamEventId: 'evt-1' },
        event: {},
      } as never),
    ).rejects.toMatchObject({ status: 404 });
    expect(deleteJamEvent).not.toHaveBeenCalled();
    expect(ensureProfileOrGuest).not.toHaveBeenCalled();
  });

  it('delegates to deleteJamEvent with the resolved profile and path ids', async () => {
    vi.mocked(findJamEvent).mockResolvedValue(jamPost);
    vi.mocked(deleteJamEvent).mockResolvedValue(true);

    await dispatch('host');

    expect(deleteJamEvent).toHaveBeenCalledWith('host', 'jamevent', 'evt-1');
  });

  it('propagates the core 403 when the viewer may not delete', async () => {
    vi.mocked(findJamEvent).mockResolvedValue(jamPost);
    // Core `forbidden()` is a plain `__allPeepError__` object carrying a
    // numeric `code`; the route re-maps it onto an HTTP `status`.
    vi.mocked(deleteJamEvent).mockRejectedValue({
      __allPeepError__: true,
      code: 403,
      errorKey: 'forbidden',
      parameters: undefined,
    });

    await expect(dispatch('outsider')).rejects.toMatchObject({ status: 403 });
    expect(deleteJamEvent).toHaveBeenCalledWith(
      'outsider',
      'jamevent',
      'evt-1',
    );
  });
});
