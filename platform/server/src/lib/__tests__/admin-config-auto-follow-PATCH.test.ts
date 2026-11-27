import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureRoleCapabilities } from '#lib/auth';
import { getLocalProfileByHandle } from '@openpeepshq/core/profiles';
import { updateConfigValues } from '@openpeepshq/core/config';
import { apiEndpoint } from '../../api/openpeeps/core/v1/admin/config/[namespace]/[name]/PATCH';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

// Unit-level test of the autoFollow backstop in the admin config PATCH route
// (review item 3): a save containing a handle that does not resolve to a
// local profile must be rejected before anything is written. The route's
// external dependencies (capability auth, profile lookup, config store) are
// mocked; the validation logic itself runs unmocked.
vi.mock('#lib/auth', () => ({
  ensureRoleCapabilities: vi.fn(async () => undefined),
}));
vi.mock('@openpeepshq/core/profiles', () => ({
  getLocalProfileByHandle: vi.fn(),
  // The route imports this too; the factory must define every named export
  // the route uses. Mirrors core's real implementation.
  normalizeAutoFollowHandle: (h: string) => h.replace(/^@/, '').trim(),
}));
vi.mock('@openpeepshq/core/config', () => ({
  updateConfigValues: vi.fn(),
}));

const localProfile = { id: 'p2', handle: 'news' } as ProfileWithMeta;

const call = (config: unknown) =>
  apiEndpoint.handle({
    body: { config },
    query: {},
    param: { namespace: 'community', name: 'info' },
    // The authorization middleware always provides `context.currentProfile`;
    // it is null in these tests, so the audit branch is skipped.
    event: { context: { currentProfile: null } },
  });

describe('admin config PATCH — autoFollow validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a save that contains an unknown auto-follow handle', async () => {
    vi.mocked(getLocalProfileByHandle).mockImplementation(async (handle) =>
      handle === 'news' ? localProfile : undefined,
    );

    await expect(
      call({ content: { autoFollow: ['news', 'ghost'] } }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Unknown auto-follow handles: ghost',
    });
    expect(updateConfigValues).not.toHaveBeenCalled();
  });

  it('rejects a save whose autoFollow is not a list of strings', async () => {
    // The z.array(z.string()) branch must fire before profile resolution and
    // before anything is written (review round-3 item 2).
    for (const bad of ['news', [1]]) {
      await expect(
        call({ content: { autoFollow: bad } }),
      ).rejects.toMatchObject({
        status: 400,
        message: 'Auto-follow handles must be a list of strings',
      });
    }
    expect(getLocalProfileByHandle).not.toHaveBeenCalled();
    expect(updateConfigValues).not.toHaveBeenCalled();
  });

  it('accepts a save whose handles all resolve to local profiles', async () => {
    vi.mocked(getLocalProfileByHandle).mockResolvedValue(localProfile);

    const res = await call({ content: { autoFollow: ['@news'] } });

    expect(res).toEqual({ success: true });
    expect(getLocalProfileByHandle).toHaveBeenCalledWith('news');
    expect(updateConfigValues).toHaveBeenCalledWith(
      { content: { autoFollow: ['@news'] } },
      'community',
      'info',
    );
  });

  it('does not run auto-follow validation when the field is absent', async () => {
    const res = await call({ info: { tagLine: 'hello' } });

    expect(res).toEqual({ success: true });
    expect(getLocalProfileByHandle).not.toHaveBeenCalled();
    expect(updateConfigValues).toHaveBeenCalledWith(
      { info: { tagLine: 'hello' } },
      'community',
      'info',
    );
    expect(vi.mocked(ensureRoleCapabilities).mock.calls.at(-1)?.[1]).toEqual([
      'core-config-update',
    ]);
  });
});
