import { describe, expect, it } from 'vitest';
import {
  capabilityEditorGroups,
  capabilitySetsEqual,
  cycleCapabilityCell,
  diffRelationshipMatrix,
  getCapabilityCellState,
  isCoveredByWildcard,
  isGrantedByColumn,
  normalizeCapabilities,
} from '../capabilityMatrix';
import {
  profileCapabilityEditorKeys,
  profileRelationships,
  reportCapabilityEditorKeys,
  roleCapabilityEditorKeys,
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
