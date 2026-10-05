import { describe, expect, it } from 'vitest';
import {
  capabilityEditorGroups,
  capabilitySetsEqual,
  cycleCapabilityCell,
  diffRelationshipMatrix,
  filterRoles,
  getCapabilityCellState,
  isCoveredByWildcard,
  isGrantedByColumn,
  normalizeCapabilities,
  roleDefaultCapabilities,
  roleKeyFromName,
} from '../capabilityMatrix';
import {
  profileCapabilityEditorKeys,
  profileRelationships,
  reportCapabilityEditorKeys,
  roleCapabilityEditorKeys,
  type Capabilities,
  type Role,
} from '@openpeepshq/common/types';

const profileOptions = {
  editorKeys: [...profileCapabilityEditorKeys],
  columns: [...profileRelationships],
  everyoneColumn: 'none',
};

const rolesOptions = {
  editorKeys: [...roleCapabilityEditorKeys],
  columns: ['admin', 'local', 'member', 'owner'],
  everyoneColumn: undefined,
};

describe('capabilityMatrix helpers', () => {
  it('groups relation leaves under their wildcard prefix', () => {
    const groups = capabilityEditorGroups(profileCapabilityEditorKeys);
    const byWildcard = Object.fromEntries(
      groups.map((group) => [group.wildcard, group.leaves]),
    );
    expect(byWildcard['core-profiles-*']).toEqual(
      expect.arrayContaining([
        'core-profiles-read',
        'core-profiles-follow',
        'core-profiles-update',
      ]),
    );
    // post-only capabilities are not grouped under the profiles wildcard
    expect(byWildcard['core-profiles-*']).not.toEqual(
      expect.arrayContaining(['core-posts-read']),
    );
  });

  it('groups every role capability under a category or the catch-all wildcard', () => {
    const groups = capabilityEditorGroups(roleCapabilityEditorKeys);
    // Every non-wildcard capability key must land in some group so it is visible.
    const leaves = groups.flatMap((group) => group.leaves);
    expect(leaves).toEqual(
      expect.arrayContaining([
        'core-local',
        'core-profiles-read',
        'core-posts-create-note-local',
        'core-groups-read',
      ]),
    );
    expect(leaves).toHaveLength(
      roleCapabilityEditorKeys.filter((k) => !k.includes('*')).length,
    );
  });

  it('cascades the none column to other relationships', () => {
    const caps = { none: { add: ['core-profiles-read'] } };
    expect(
      getCapabilityCellState(
        profileOptions,
        caps,
        'self',
        'core-profiles-read',
      ),
    ).toBe('implicit-add');
    expect(
      getCapabilityCellState(
        profileOptions,
        caps,
        'local',
        'core-profiles-read',
      ),
    ).toBe('implicit-add');
    // The none column itself is a specific grant.
    expect(
      getCapabilityCellState(
        profileOptions,
        caps,
        'none',
        'core-profiles-read',
      ),
    ).toBe('specific-add');
  });

  it('locks other relationships when none wildcard denies', () => {
    const caps = { none: { remove: ['core-profiles-*'] } };
    expect(
      getCapabilityCellState(
        profileOptions,
        caps,
        'self',
        'core-profiles-read',
      ),
    ).toBe('implicit-remove');
    expect(
      cycleCapabilityCell(profileOptions, caps, 'self', 'core-profiles-read'),
    ).toEqual(caps);
  });

  it('cycles a relationship override when none grants', () => {
    const caps = { none: { add: ['core-profiles-read'] } };
    const denied = cycleCapabilityCell(
      profileOptions,
      caps,
      'self',
      'core-profiles-read',
    );
    expect(
      getCapabilityCellState(
        profileOptions,
        denied,
        'self',
        'core-profiles-read',
      ),
    ).toBe('specific-remove');
    expect(isGrantedByColumn(denied, 'none', 'core-profiles-read')).toBe(true);
  });

  it('does not cross-inherit between independent roles', () => {
    const caps = { admin: { add: ['core-profiles-read'] } };
    // member does not inherit admin's grant because there is no everyone column
    expect(
      getCapabilityCellState(
        rolesOptions,
        caps,
        'member',
        'core-profiles-read',
      ),
    ).toBe('none');
  });

  it('shows implicit-add for a role granted by a wildcard', () => {
    const caps = { owner: { add: ['*'] } };
    expect(
      getCapabilityCellState(rolesOptions, caps, 'owner', 'core-profiles-read'),
    ).toBe('implicit-add');
  });

  it('cycles none -> specific-add -> specific-remove -> none for roles', () => {
    let caps: Record<string, unknown> = { member: { add: [], remove: [] } };
    expect(
      getCapabilityCellState(rolesOptions, caps, 'member', 'core-groups-read'),
    ).toBe('none');

    caps = cycleCapabilityCell(
      rolesOptions,
      caps,
      'member',
      'core-groups-read',
    );
    expect(
      getCapabilityCellState(rolesOptions, caps, 'member', 'core-groups-read'),
    ).toBe('specific-add');

    caps = cycleCapabilityCell(
      rolesOptions,
      caps,
      'member',
      'core-groups-read',
    );
    expect(
      getCapabilityCellState(rolesOptions, caps, 'member', 'core-groups-read'),
    ).toBe('specific-remove');

    caps = cycleCapabilityCell(
      rolesOptions,
      caps,
      'member',
      'core-groups-read',
    );
    expect(
      getCapabilityCellState(rolesOptions, caps, 'member', 'core-groups-read'),
    ).toBe('none');
  });

  it('locks a role cell denied by a wildcard', () => {
    const caps = { member: { remove: ['core-profiles-*'] } };
    expect(
      getCapabilityCellState(
        rolesOptions,
        caps,
        'member',
        'core-profiles-read',
      ),
    ).toBe('implicit-remove');
  });

  it('normalizes redundant role adds under a wildcard', () => {
    const caps = normalizeCapabilities(rolesOptions, {
      member: {
        add: ['core-profiles-*', 'core-profiles-read', 'core-profiles-follow'],
      },
    });
    expect(caps.member?.add).toEqual(['core-profiles-*']);
  });

  it('honors the everyone column of the supplied options', () => {
    // report has no wildcards; none is still the everyone column
    const opts = {
      editorKeys: [...reportCapabilityEditorKeys],
      columns: ['none', 'local', 'reporter'],
      everyoneColumn: 'none',
    };
    const caps = { none: { add: ['core-reports-create'] } };
    // The none column is a specific grant...
    expect(
      getCapabilityCellState(opts, caps, 'none', 'core-reports-create'),
    ).toBe('specific-add');
    // ...and cascades to other columns as an implicit allow.
    expect(
      getCapabilityCellState(opts, caps, 'reporter', 'core-reports-create'),
    ).toBe('implicit-add');
  });

  it('compares capability arrays as sets', () => {
    expect(capabilitySetsEqual(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(capabilitySetsEqual(['a'], ['a', 'b'])).toBe(false);
    expect(capabilitySetsEqual(undefined, [])).toBe(true);
    expect(capabilitySetsEqual([], undefined)).toBe(true);
  });

  it('diffs only relationship buckets that differ from defaults', () => {
    const edited = {
      none: { add: ['core-profiles-read'], remove: [] },
      self: { add: ['core-profiles-follow'], remove: [] },
    };
    const defaults = {
      none: { add: ['core-profiles-read'], remove: [] },
      self: { add: ['core-profiles-read'], remove: [] },
    };
    const changed = diffRelationshipMatrix(edited, defaults, ['none', 'self']);
    // none matches the default (order-independent) -> dropped
    expect(changed.none).toBeUndefined();
    // self diverges -> kept
    expect(changed.self).toEqual({ add: ['core-profiles-follow'], remove: [] });
  });

  it('returns an empty diff when nothing changed', () => {
    const caps = { none: { add: ['core-profiles-read'], remove: [] } };
    expect(diffRelationshipMatrix(caps, caps, ['none'])).toEqual({});
  });

  it('flags an explicitly-cleared bucket as a change', () => {
    const edited = { none: { add: [], remove: [] } };
    const defaults = { none: { add: ['core-profiles-read'], remove: [] } };
    const changed = diffRelationshipMatrix(edited, defaults, ['none']);
    expect(changed.none).toEqual({ add: [], remove: [] });
  });
});

describe('roleKeyFromName', () => {
  it('lowercases and hyphenates a display name', () => {
    expect(roleKeyFromName('Group Translator')).toBe('group-translator');
  });

  it('collapses repeated separators and trims edge hyphens', () => {
    expect(roleKeyFromName('  --Super  Admin-- ')).toBe('super-admin');
  });

  it('drops digits and unsupported characters', () => {
    expect(roleKeyFromName('Editor 2.0')).toBe('editor');
  });

  it('caps the key at 32 characters without a trailing hyphen', () => {
    const key = roleKeyFromName('a'.repeat(16) + '-b'.repeat(16));
    expect(key.length).toBeLessThanOrEqual(32);
    expect(key.endsWith('-')).toBe(false);
  });

  it('returns an empty string when no letters remain', () => {
    expect(roleKeyFromName('123 !!')).toBe('');
  });
});

const roleFixture = (
  key: string,
  displayName: string,
  isDefault: boolean,
  capabilities: Capabilities = { add: [], remove: [] },
): Role => ({
  id: key,
  key,
  default: isDefault,
  displayName,
  capabilities,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

describe('filterRoles', () => {
  const roles = [
    roleFixture('owner', 'Owner', true),
    roleFixture('member', 'Member', true),
    roleFixture('group-translator', 'Group Translator', false),
  ];
  const showAll = { showDefault: true, showCustom: true, filter: '' };

  it('keeps every role without a filter', () => {
    expect(filterRoles(roles, showAll).map((role) => role.key)).toEqual([
      'owner',
      'member',
      'group-translator',
    ]);
  });

  it('hides default roles when showDefault is off', () => {
    expect(
      filterRoles(roles, { ...showAll, showDefault: false }).map(
        (role) => role.key,
      ),
    ).toEqual(['group-translator']);
  });

  it('hides custom roles when showCustom is off', () => {
    expect(
      filterRoles(roles, { ...showAll, showCustom: false }).map(
        (role) => role.key,
      ),
    ).toEqual(['owner', 'member']);
  });

  it('matches the display name case-insensitively', () => {
    expect(
      filterRoles(roles, { ...showAll, filter: 'MEMBER' }).map(
        (role) => role.key,
      ),
    ).toEqual(['member']);
  });

  it('matches the role key when the name does not contain the filter', () => {
    expect(
      filterRoles(roles, { ...showAll, filter: 'group-' }).map(
        (role) => role.key,
      ),
    ).toEqual(['group-translator']);
  });

  it('ignores surrounding whitespace in the filter', () => {
    expect(
      filterRoles(roles, { ...showAll, filter: '  owner  ' }).map(
        (role) => role.key,
      ),
    ).toEqual(['owner']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterRoles(roles, { ...showAll, filter: 'nope' })).toEqual([]);
  });
});

describe('roleDefaultCapabilities', () => {
  it('returns factory defaults for built-in roles with customized capabilities', () => {
    const roles = [
      roleFixture('owner', 'Owner', true, {
        add: ['core-logs-read'],
        remove: [],
      }),
      roleFixture('member', 'Member', true, {
        add: ['core-local'],
        remove: [],
      }),
    ];
    const defaults = roleDefaultCapabilities(roles);
    expect(defaults.owner).toEqual({ add: ['*'], remove: [] });
    expect(defaults.member).toEqual({
      add: [
        'core-local',
        'core-posts-create-*',
        'core-groups-create',
        'core-reports-create',
      ],
      remove: [],
    });
  });

  it('returns the saved capabilities for custom roles', () => {
    const saved = { add: ['core-groups-read'], remove: ['core-local'] };
    const roles = [
      roleFixture('group-translator', 'Group Translator', false, saved),
    ];
    expect(roleDefaultCapabilities(roles)['group-translator']).toEqual(saved);
  });

  it('falls back to saved capabilities for a built-in role without a factory entry', () => {
    const saved = { add: ['core-logs-read'], remove: [] };
    const roles = [roleFixture('unknown-default', 'Unknown', true, saved)];
    expect(roleDefaultCapabilities(roles)['unknown-default']).toEqual(saved);
  });
});
