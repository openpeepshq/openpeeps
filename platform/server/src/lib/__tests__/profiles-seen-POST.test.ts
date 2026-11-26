import { beforeEach, describe, expect, it, vi } from 'vitest';

// Unit-level test of the profile-view ingest endpoint (#802): mirrors
// posts/seen. The handler's external deps (auth + profile lookup + seen
// mutation) are mocked; the handler's own branch logic runs unmocked.
vi.mock('#lib/auth', () => ({
  ensureLocalProfile: vi.fn(),
  ensureProfileCapabilities: vi.fn(),
}));
vi.mock('@openpeepshq/core/profiles', () => ({
  findProfile: vi.fn(),
  markProfilesSeen: vi.fn(),
}));

import { ensureLocalProfile, ensureProfileCapabilities } from '#lib/auth';
import { findProfile, markProfilesSeen } from '@openpeepshq/core/profiles';
import { apiEndpoint } from '../../api/openpeeps/core/v1/profiles/seen/POST';

const viewer = { id: 'profile-1' };
const event = {} as never;

// The shape a rejected capability check throws; shared by both 403 test sites.
const forbiddenError = () =>
  Object.assign(new Error('Forbidden'), { status: 403 });

const call = (profileIds: string[]) =>
  apiEndpoint.handle({
    body: { profileIds },
    query: {},
    param: {},
    event,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ensureLocalProfile).mockResolvedValue(viewer as never);
  vi.mocked(ensureProfileCapabilities).mockResolvedValue(undefined);
  vi.mocked(markProfilesSeen).mockResolvedValue(undefined);
});

describe('POST /profiles/seen (#802)', () => {
  it('ingests a visible profile and records the view', async () => {
    vi.mocked(findProfile).mockResolvedValue({
      id: 'profile-2',
    } as never);

    await expect(call(['profile-2'])).resolves.toEqual({ success: true });

    expect(ensureProfileCapabilities).toHaveBeenCalledWith(
      event,
      { id: 'profile-2' },
      ['core-profiles-read'],
    );
    expect(markProfilesSeen).toHaveBeenCalledWith(['profile-2'], viewer);
  });

  it('dedupes repeated ids in the payload', async () => {
    vi.mocked(findProfile).mockResolvedValue({ id: 'profile-2' } as never);

    await expect(call(['profile-2', 'profile-2'])).resolves.toEqual({
      success: true,
    });

    // The handler dedupes before lookup + mutation.
    expect(findProfile).toHaveBeenCalledTimes(1);
    expect(markProfilesSeen).toHaveBeenCalledWith(['profile-2'], viewer);
  });

  it('skips the viewer self-viewing their own profile', async () => {
    vi.mocked(findProfile).mockResolvedValue({ id: 'profile-1' } as never);

    await expect(call(['profile-1'])).resolves.toEqual({ success: true });

    // A self-view is noise for a top-profiles ranking, so it is excluded
    // before the capability check and before the mutation.
    expect(ensureProfileCapabilities).not.toHaveBeenCalled();
    expect(markProfilesSeen).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown or deleted profile', async () => {
    vi.mocked(findProfile).mockResolvedValue(undefined);

    await expect(call(['profile-404'])).rejects.toMatchObject({ status: 404 });

    expect(markProfilesSeen).not.toHaveBeenCalled();
  });

  it('rejects a blocked viewer with 403 and records nothing', async () => {
    vi.mocked(findProfile).mockResolvedValue({ id: 'profile-2' } as never);
    vi.mocked(ensureProfileCapabilities).mockRejectedValue(forbiddenError());

    await expect(call(['profile-2'])).rejects.toMatchObject({ status: 403 });

    expect(markProfilesSeen).not.toHaveBeenCalled();
  });

  it('rejects a mixed payload all-or-nothing: 403 before any view row is written', async () => {
    // The all-or-nothing contract depends on ordering: every target's
    // capability check must complete before the single mutation runs. A
    // mixed payload (one visible, one blocked) must 403 with zero rows
    // written — including for the visible first id.
    const order: string[] = [];
    vi.mocked(findProfile).mockImplementation((async (id: string) => {
      order.push(`find:${id}`);
      return { id } as never;
    }) as never);
    vi.mocked(ensureProfileCapabilities).mockImplementation(((
      _event: never,
      target: { id: string },
    ) => {
      order.push(`caps:${target.id}`);
      if (target.id === 'profile-blocked') {
        return Promise.reject(forbiddenError());
      }
      return Promise.resolve(undefined);
    }) as never);

    await expect(call(['profile-2', 'profile-blocked'])).rejects.toMatchObject({
      status: 403,
    });

    // The visible target's capability check ran (and passed) before the
    // blocked target rejected, and the mutation — the only write path —
    // never ran. This pins the no-partial-ingest ordering against a future
    // reordering that wrote per-target or before all capability checks.
    expect(order).toEqual([
      'find:profile-2',
      'caps:profile-2',
      'find:profile-blocked',
      'caps:profile-blocked',
    ]);
    expect(markProfilesSeen).not.toHaveBeenCalled();
  });
});
