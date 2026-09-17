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

vi.mock('./mapping', () => ({
  accountProfileRelation: {},
  baseProfilesMapping: {},
  membersRelation: {},
  profileRoleRelation: {},
}));

vi.mock('../db/pg/filters', () => ({
  profileFilters: {},
}));

import { findRolesByCapabilities } from '../roles/finders';
import { rolesMapping } from '../roles/mapping';
import { listProfilesWithCapabilities } from './finders';

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
