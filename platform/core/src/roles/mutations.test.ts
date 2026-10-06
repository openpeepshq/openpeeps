import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultRoles, Role, RoleData } from '@openpeepshq/common/types';

const testState = vi.hoisted(() => ({
  roles: [] as Role[],
  now: '2024-01-01T00:00:00.000Z',
}));

// Add a fictional older defaults version so the rebase path can be tested
// without touching the real history in common.
vi.mock('@openpeepshq/common/types', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openpeepshq/common/types')>();
  const baseVersion = '2026-01-01';
  const history = [
    {
      version: baseVersion,
      roles: actual.defaultRoles.map((role) =>
        role.key === 'member'
          ? {
              ...role,
              capabilities: {
                add: ['core-local', 'core-legacy-cap', 'core-groups-create'],
                remove: [],
              },
            }
          : role,
      ),
    },
    { version: actual.currentRoleDefaults.version, roles: actual.defaultRoles },
  ];
  return {
    ...actual,
    roleDefaultsHistory: history,
    currentRoleDefaults: history[history.length - 1],
    defaultRoles: history[history.length - 1].roles,
    findRoleDefaultsVersion: (version: string) =>
      history.find((entry) => entry.version === version),
  };
});

vi.mock('../db', () => ({
  allpeepDb: vi.fn(async () => ({ db: {} })),
}));

vi.mock('../errors', () => ({
  conflict: vi.fn(() => new Error('conflict')),
}));

vi.mock('./finders', () => ({
  findRole: vi.fn(
    async (id: string) =>
      testState.roles.find((role) => role.id === id) ?? null,
  ),
  findRoleByKey: vi.fn(
    async (key: string) =>
      testState.roles.find((role) => role.key === key) ?? null,
  ),
}));

vi.mock('./mapping', () => ({
  rolesMapping: {
    create: vi.fn(async (_db: unknown, data: RoleData) => {
      const role: Role = {
        id: `role-${data.key}`,
        createdAt: testState.now,
        updatedAt: testState.now,
        ...data,
      };
      testState.roles.push(role);
      return role;
    }),
    update: vi.fn(
      async (_db: unknown, id: string, patch: Partial<RoleData>) => {
        const role = testState.roles.find((r) => r.id === id);
        if (!role) throw new Error(`unknown role ${id}`);
        Object.assign(role, patch);
        return role;
      },
    ),
  },
}));

vi.mock('../profiles/cache', () => ({
  profilesCache: { clear: vi.fn(async () => undefined) },
}));

import { setDefaultRoles, updateRole } from './mutations';
import { rolesMapping } from './mapping';

const factoryRole = (key: string): RoleData => {
  const role = defaultRoles.find((r) => r.key === key);
  if (!role) throw new Error(`unknown factory role ${key}`);
  return role;
};

const storedRole = (key: string, overrides: Partial<RoleData> = {}): Role => ({
  id: `role-${key}`,
  createdAt: testState.now,
  updatedAt: testState.now,
  ...factoryRole(key),
  ...overrides,
});

const reversed = (caps: RoleData['capabilities']) => ({
  add: [...(caps?.add ?? [])].reverse(),
  remove: [...(caps?.remove ?? [])],
});

const customRole: Role = {
  id: 'role-group-translator',
  createdAt: testState.now,
  updatedAt: testState.now,
  key: 'group-translator',
  default: false,
  displayName: 'Group Translator',
  capabilities: { add: ['core-groups-read'], remove: [] },
};

beforeEach(() => {
  testState.roles = [];
  vi.clearAllMocks();
});

describe('setDefaultRoles', () => {
  it('creates missing built-in roles with default: true', async () => {
    await setDefaultRoles();
    expect(testState.roles).toHaveLength(6);
    for (const factory of defaultRoles) {
      const role = testState.roles.find((r) => r.key === factory.key);
      expect(role?.default).toBe(true);
      expect(role?.capabilities).toEqual(factory.capabilities);
    }
  });

  it('performs no writes when all built-in roles are at the factory defaults', async () => {
    testState.roles = defaultRoles.map((role) => storedRole(role.key));
    await setDefaultRoles();
    expect(rolesMapping.create).not.toHaveBeenCalled();
    expect(rolesMapping.update).not.toHaveBeenCalled();
  });

  it('syncs default-flagged roles that drifted from the factory back to it', async () => {
    testState.roles = [
      storedRole('admin', { capabilities: { add: ['*'], remove: [] } }),
    ];
    await setDefaultRoles();
    const admin = testState.roles.find((r) => r.key === 'admin');
    expect(admin?.default).toBe(true);
    expect(admin?.capabilities).toEqual(factoryRole('admin').capabilities);
  });

  it('keeps customized roles marked default: false untouched', async () => {
    const customized = {
      add: ['core-local'],
      remove: ['core-posts-create-*'],
    };
    testState.roles = [
      storedRole('member', { default: false, capabilities: customized }),
    ];
    await setDefaultRoles();
    const member = testState.roles.find((r) => r.key === 'member');
    expect(member?.default).toBe(false);
    expect(member?.capabilities).toEqual(customized);
    expect(rolesMapping.update).not.toHaveBeenCalled();
  });

  it('re-adopts roles whose capabilities exactly match the factory, ignoring list order', async () => {
    const atFactory = storedRole('member', {
      default: false,
      displayName: 'My Members',
      capabilities: reversed(factoryRole('member').capabilities),
    });
    testState.roles = [atFactory];
    await setDefaultRoles();
    const member = testState.roles.find((r) => r.key === 'member');
    expect(member?.default).toBe(true);
    expect(member?.displayName).toBe('My Members');
    expect(member?.capabilities).toEqual(atFactory.capabilities);
  });

  it('leaves custom roles untouched', async () => {
    testState.roles = [{ ...customRole }];
    await setDefaultRoles();
    const custom = testState.roles.find((r) => r.key === customRole.key);
    expect(custom?.default).toBe(false);
    expect(custom?.capabilities).toEqual(customRole.capabilities);
    expect(rolesMapping.update).not.toHaveBeenCalled();
  });
});

describe('setDefaultRoles rebase', () => {
  it('merges the default changes since the base version into a customized role', async () => {
    testState.roles = [
      storedRole('member', {
        default: false,
        baseVersion: '2026-01-01',
        capabilities: {
          add: [
            'core-local',
            'core-groups-create',
            'core-legacy-cap',
            'core-custom-cap',
          ],
          remove: [],
        },
      }),
    ];
    await setDefaultRoles();
    const member = testState.roles.find((r) => r.key === 'member');
    expect(member?.default).toBe(false);
    expect(member?.baseVersion).toBe('2026-10-06');
    // Custom cap kept, cap dropped by the defaults removed, caps gained by
    // the defaults appended.
    expect(member?.capabilities).toEqual({
      add: [
        'core-local',
        'core-groups-create',
        'core-custom-cap',
        'core-posts-create-*',
        'core-reports-create',
      ],
      remove: [],
    });
  });

  it('does not rebase when the base version is not in the history', async () => {
    testState.roles = [
      storedRole('member', {
        default: false,
        baseVersion: '1999-01-01',
        capabilities: { add: ['core-local'], remove: [] },
      }),
    ];
    await setDefaultRoles();
    const member = testState.roles.find((r) => r.key === 'member');
    expect(member?.capabilities).toEqual({ add: ['core-local'], remove: [] });
    expect(member?.baseVersion).toBe('1999-01-01');
    expect(rolesMapping.update).not.toHaveBeenCalled();
  });

  it('performs no write when the versions changed nothing for the role', async () => {
    testState.roles = [
      storedRole('admin', {
        default: false,
        baseVersion: '2026-01-01',
        capabilities: { add: ['core-accounts-read'], remove: [] },
      }),
    ];
    await setDefaultRoles();
    const admin = testState.roles.find((r) => r.key === 'admin');
    expect(admin?.capabilities).toEqual({
      add: ['core-accounts-read'],
      remove: [],
    });
    expect(admin?.baseVersion).toBe('2026-01-01');
    expect(rolesMapping.update).not.toHaveBeenCalled();
  });

  it('still re-adopts a role at the current factory even with an older baseVersion', async () => {
    testState.roles = [
      storedRole('member', {
        default: false,
        baseVersion: '2026-01-01',
        capabilities: reversed(factoryRole('member').capabilities),
      }),
    ];
    await setDefaultRoles();
    const member = testState.roles.find((r) => r.key === 'member');
    expect(member?.default).toBe(true);
    expect(member?.baseVersion).toBe('2026-10-06');
  });

  it('keeps managed default-flagged roles in sync instead of rebasing them', async () => {
    testState.roles = [
      storedRole('member', {
        default: true,
        baseVersion: '2026-01-01',
        capabilities: { add: ['core-local'], remove: [] },
      }),
    ];
    await setDefaultRoles();
    const member = testState.roles.find((r) => r.key === 'member');
    expect(member?.default).toBe(true);
    expect(member?.baseVersion).toBe('2026-10-06');
    expect(member?.capabilities).toEqual(factoryRole('member').capabilities);
  });
});

describe('updateRole default adoption', () => {
  it('re-adopts a factory-matching role even when saved with an explicit default: false', async () => {
    testState.roles = [storedRole('member')];
    const result = await updateRole('role-member', {
      default: false,
      capabilities: reversed(factoryRole('member').capabilities),
    });
    expect(result.default).toBe(true);
  });

  it('keeps customized roles marked default: false', async () => {
    const customized = { add: ['core-local'], remove: [] };
    testState.roles = [
      storedRole('member', { default: false, capabilities: customized }),
    ];
    const result = await updateRole('role-member', {
      default: false,
      capabilities: customized,
    });
    expect(result.default).toBe(false);
  });

  it('re-adopts on a partial write that does not touch capabilities', async () => {
    testState.roles = [
      storedRole('member', { default: false, baseVersion: '2026-01-01' }),
    ];
    const result = await updateRole('role-member', { displayName: 'Members' });
    expect(result.default).toBe(true);
    expect(result.displayName).toBe('Members');
    expect(result.capabilities).toEqual(factoryRole('member').capabilities);
    expect(result.baseVersion).toBe('2026-10-06');
  });

  it('keeps an explicit default: true on a built-in role', async () => {
    testState.roles = [
      storedRole('owner', {
        default: false,
        capabilities: { add: ['core-logs-read'], remove: [] },
      }),
    ];
    const result = await updateRole('role-owner', { default: true });
    expect(result.default).toBe(true);
  });

  it('never adopts custom roles without a factory entry', async () => {
    testState.roles = [{ ...customRole }];
    const result = await updateRole(customRole.id, {
      displayName: 'Translator',
    });
    expect(result.default).toBe(false);
    expect(result.displayName).toBe('Translator');
  });
});
