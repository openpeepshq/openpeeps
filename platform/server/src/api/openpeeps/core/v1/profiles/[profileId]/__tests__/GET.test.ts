import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicProfile, ProfileWithMeta } from '@openpeepshq/common/types';
import { findProfile, getProfile } from '@openpeepshq/core/profiles';
import { ensureAccess } from '#lib/auth';
import { publicProfileForViewer } from '#lib/handlers/profile/block';
import { apiEndpoint } from '../GET';

// Route-level: stub the lookups and the block handler so we assert the wiring
// (when the soft-delete filter is ignored, when 404 vs tombstone is chosen).
vi.mock('#lib/auth', () => ({
  ensureAccess: vi.fn(),
}));
vi.mock('@openpeepshq/core/profiles', () => ({
  findProfile: vi.fn(),
  getProfile: vi.fn(),
}));
vi.mock('#lib/handlers/profile/block', () => ({
  publicProfileForViewer: vi.fn(),
}));

const tombstone = {
  id: '9f1c8c1e-2a4b-4c6d-9e0f-1a2b3c4d5e6f',
  type: 'local',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
  deletedAt: '2026-03-01T00:00:00.000Z',
  handle: 'gone',
  displayName: 'Gone',
  avatar: null,
} satisfies PublicProfile;

// A mapped, soft-deleted member row: `deactivatedAt` is flattened top-level
// (that is what isDeactivatedProfile checks), with the original identity kept.
const deactivatedRow = {
  id: tombstone.id,
  handle: 'deleted-xyz',
  type: 'local',
  createdAt: tombstone.createdAt,
  updatedAt: tombstone.updatedAt,
  deletedAt: tombstone.deletedAt,
  deactivatedAt: '2026-03-01T00:00:00.000Z',
  deactivatedOriginalHandle: 'gone',
  deactivatedOriginalDisplayName: 'Gone',
} as unknown as ProfileWithMeta;

const call = () =>
  apiEndpoint.handle({
    body: {},
    query: {},
    param: { profileId: tombstone.id },
    event: {},
  } as never);

describe('profiles [profileId] GET (issue #1764 tombstone)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureAccess).mockResolvedValue(undefined as never);
  });

  it('404s when the profile is hard-deleted (no row at all)', async () => {
    vi.mocked(findProfile).mockResolvedValue(undefined);
    vi.mocked(getProfile).mockResolvedValue(undefined as never);
    await expect(call()).rejects.toMatchObject({ status: 404 });
    // The soft-delete filter was ignored for the second lookup.
    expect(getProfile).toHaveBeenCalledWith(tombstone.id, true);
    expect(publicProfileForViewer).not.toHaveBeenCalled();
  });

  it('renders the tombstone for a soft-deleted (deactivated) member', async () => {
    vi.mocked(findProfile).mockResolvedValue(undefined);
    vi.mocked(getProfile).mockResolvedValue(deactivatedRow);
    vi.mocked(publicProfileForViewer).mockResolvedValue(tombstone);

    await expect(call()).resolves.toEqual(tombstone);
    expect(getProfile).toHaveBeenCalledWith(tombstone.id, true);
    expect(publicProfileForViewer).toHaveBeenCalledWith(
      expect.anything(),
      deactivatedRow,
      expect.any(String),
    );
  });

  it('does not consult the soft-delete filter for a live profile', async () => {
    const live = {
      ...deactivatedRow,
      deletedAt: null,
      deactivatedAt: undefined,
    } as unknown as ProfileWithMeta;
    vi.mocked(findProfile).mockResolvedValue(live);
    vi.mocked(publicProfileForViewer).mockResolvedValue(tombstone);

    await expect(call()).resolves.toEqual(tombstone);
    expect(getProfile).not.toHaveBeenCalled();
  });
});

describe('publicProfileForViewer (real tombstone shape)', () => {
  it('returns a schema-valid minimal tombstone for a deactivated profile', async () => {
    const real = (await vi.importActual(
      '#lib/handlers/profile/block',
    )) as typeof import('#lib/handlers/profile/block');

    const result = await real.publicProfileForViewer(
      { context: {}, profile: {} },
      deactivatedRow,
      `Profile with id ${tombstone.id}`,
    );

    // Only the tombstone fields survive; the stored body is not leaked.
    expect(result).toMatchObject({
      id: tombstone.id,
      handle: 'gone',
      displayName: 'Gone',
      avatar: null,
      deletedAt: '2026-03-01T00:00:00.000Z',
    });
  });
});
