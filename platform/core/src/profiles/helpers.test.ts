import { describe, expect, it, vi } from 'vitest';
import { insertEdge } from '../db/pg/helpers';

vi.mock('../db/pg/helpers', () => ({
  insertEdge: vi.fn(async () => 'edge-new'),
}));
vi.mock('../db', () => ({
  collectionInfos: {
    profilesCollection: { name: 'profiles' },
    rolesCollection: { name: 'roles' },
    hasRoleCollection: { name: 'hasRole' },
  },
}));
vi.mock('./cache', () => ({
  getProfiles: vi.fn(async (ids: string[]) => ids),
}));

import { roleAssigner } from './helpers';

const profile = { id: 'profile-1' };
const role = { id: 'role-member' };

// Minimal stand-in for the drizzle query chain used by getPgEdge.
const dbWithRows = (rows: unknown[]) => ({
  select: () => ({
    from: () => ({
      where: () => ({ limit: async () => rows }),
    }),
  }),
});

describe('roleAssigner', () => {
  it('returns the existing edge without inserting when the role is already assigned', async () => {
    const existing = { id: 'edge-1', fromId: 'profile-1', toId: 'role-member' };
    const result = await roleAssigner(
      dbWithRows([existing]) as never,
      profile as never,
      role as never,
    );
    expect(insertEdge).not.toHaveBeenCalled();
    expect(result.id).toBe('edge-1');
  });

  it('inserts a new edge when the role is not yet assigned', async () => {
    const result = await roleAssigner(
      dbWithRows([]) as never,
      profile as never,
      role as never,
    );
    expect(insertEdge).toHaveBeenCalledOnce();
    expect(result.id).toBe('edge-new');
    expect(result._from).toBe('profiles/profile-1');
    expect(result._to).toBe('roles/role-member');
  });
});
