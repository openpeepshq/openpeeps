import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileWithMeta, Role } from '@openpeepshq/common/types';

vi.mock('../roles/finders', () => ({
  findRolesByCapabilities: vi.fn(),
}));

vi.mock('../roles/mapping', () => ({
  rolesMapping: {
    relationsFrom: vi.fn(),
  },
}));

vi.mock('./helpers', () => ({
  expandProfiles: vi.fn(async (profiles: ProfileWithMeta[]) => profiles),
  followFinder: vi.fn(),
}));

vi.mock('../db', () => ({
  allpeepDb: vi.fn(async () => ({ db: {} })),
}));

vi.mock('./cache', () => ({
  getProfile: vi.fn(),
  getProfileByHandle: vi.fn(),
}));

vi.mock('../accounts/mapping', () => ({
  accountsMapping: {},
}));

vi.mock('../groups/mapping', () => ({
  groupsMapping: {},
}));

vi.mock('../groups', () => ({
  listGroups: vi.fn(),
}));

const mappingMocks = vi.hoisted(() => {
  const filter = vi.fn();
  const all = vi.fn(async () => []);
  const mapping = { filter, all };
  filter.mockReturnValue(mapping);
  return { filter, all, mapping };
});

const filterMocks = vi.hoisted(() => ({
  discoverable: vi.fn(() => ({ kind: 'sql', where: 'discoverable' })),
}));

vi.mock('./mapping', () => ({
  accountProfileRelation: {},
  baseProfilesMapping: mappingMocks.mapping,
  membersRelation: {},
  profileRoleRelation: {},
}));

vi.mock('../db/pg/filters', () => ({
  profileFilters: {
    notGuest: () => ({ kind: 'sql', where: 'not-guest' }),
    notIdIn: (ids: string[]) =>
      ids.length ? { kind: 'sql', where: 'not-id-in' } : undefined,
    ...filterMocks,
  },
}));

import { findRolesByCapabilities } from '../roles/finders';
import { rolesMapping } from '../roles/mapping';
import { listProfiles, listProfilesWithCapabilities } from './finders';

const ownerAdmin = { id: 'admin-1' } as ProfileWithMeta;

const ownerRole = {
  id: 'role-owner',
  key: 'owner',
  capabilities: { add: ['*'], remove: [] },
} as Role;
const adminRole = {
  id: 'role-admin',
  key: 'admin',
  capabilities: { add: ['core-profiles-*'], remove: [] },
} as Role;

describe('listProfiles member directory visibility', () => {
  const member = { id: 'p-1', roles: [] } as ProfileWithMeta;
  const admin = { id: 'p-1', roles: [adminRole] } as ProfileWithMeta;

  beforeEach(() => {
    vi.mocked(filterMocks.discoverable).mockClear();
  });

  it('keeps the full list for non-directory callers', async () => {
    await listProfiles();
    await listProfiles(member);
    expect(filterMocks.discoverable).not.toHaveBeenCalled();
  });

  it('hides opted-out profiles from member directory views', async () => {
    await listProfiles(member, { directoryView: true });
    expect(filterMocks.discoverable).toHaveBeenCalled();
  });

  it('hides opted-out profiles from anonymous directory views', async () => {
    await listProfiles(undefined, { directoryView: true });
    expect(filterMocks.discoverable).toHaveBeenCalled();
  });

  it('shows opted-out profiles to core-profiles-read directory viewers', async () => {
    await listProfiles(admin, { directoryView: true });
    expect(filterMocks.discoverable).not.toHaveBeenCalled();
  });
});

describe('listProfilesWithCapabilities', () => {
  beforeEach(() => {
    vi.mocked(findRolesByCapabilities).mockReset();
    vi.mocked(rolesMapping.relationsFrom).mockReset();
    vi.mocked(findRolesByCapabilities).mockResolvedValue([
      ownerRole,
      adminRole,
    ]);
    vi.mocked(rolesMapping.relationsFrom).mockReturnValue({
      all: async () => [ownerAdmin],
    } as ReturnType<typeof rolesMapping.relationsFrom>);
  });

  it('returns a profile once when it matches via owner * and admin core-profiles-*', async () => {
    const recipients = await listProfilesWithCapabilities([
      'core-profiles-roles-update',
    ]);
    const ids = recipients.map((profile) => profile.id);
    expect(ids.filter((id) => id === ownerAdmin.id)).toHaveLength(1);
    expect(ids).toEqual([ownerAdmin.id]);
  });
});
