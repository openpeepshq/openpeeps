import { describe, expect, it } from 'vitest';
import {
  cycleCapabilityCell,
  getCapabilityCellState,
  groupCapabilityEditorGroups,
  isCoveredByWildcard,
  isCoveredByWildcardRemove,
  isEffectivelyGranted,
  isGrantedByNone,
  normalizeGroupCapabilities,
} from '../groupCapabilityMatrix';

describe('groupCapabilityMatrix helpers', () => {
  it('groups leaves under the most specific wildcard prefix', () => {
    const groups = groupCapabilityEditorGroups();
    const byWildcard = Object.fromEntries(
      groups.map((group) => [group.wildcard, group.leaves]),
    );

    expect(byWildcard['core-groups-*']).toEqual(
      expect.arrayContaining(['core-groups-read', 'core-groups-update']),
    );
    expect(byWildcard['core-posts-create-*']).toEqual(
      expect.arrayContaining([
        'core-posts-create-note',
        'core-posts-create-event',
      ]),
    );
    expect(byWildcard['core-posts-*']).toEqual(
      expect.arrayContaining(['core-posts-read', 'core-posts-delete']),
    );
    expect(byWildcard['core-posts-*']).not.toEqual(
      expect.arrayContaining(['core-posts-create-note']),
    );
  });

  it('detects wildcard coverage for leaf capabilities', () => {
    const caps = {
      member: { add: ['core-groups-*'] },
    };
    expect(isCoveredByWildcard(caps, 'member', 'core-groups-read')).toBe(true);
    expect(isCoveredByWildcard(caps, 'member', 'core-posts-read')).toBe(false);
  });

  it('detects wildcard remove coverage', () => {
    const caps = {
      member: { remove: ['core-posts-*'] },
    };
    expect(
      isCoveredByWildcardRemove(caps, 'member', 'core-posts-create-event'),
    ).toBe(true);
  });

  it('reports implicit-add and specific-remove for wildcard exclusions', () => {
    const caps = {
      member: { add: ['core-posts-create-*'] },
    };
    expect(
      getCapabilityCellState(caps, 'member', 'core-posts-create-event'),
    ).toBe('implicit-add');

    const denied = cycleCapabilityCell(
      caps,
      'member',
      'core-posts-create-event',
    );
    expect(
      getCapabilityCellState(denied, 'member', 'core-posts-create-event'),
    ).toBe('specific-remove');
    expect(
      isEffectivelyGranted(denied, 'member', 'core-posts-create-event'),
    ).toBe(false);
  });

  it('cycles none → specific-add → specific-remove → none', () => {
    let caps = {};
    expect(getCapabilityCellState(caps, 'member', 'core-groups-read')).toBe(
      'none',
    );

    caps = cycleCapabilityCell(caps, 'member', 'core-groups-read');
    expect(getCapabilityCellState(caps, 'member', 'core-groups-read')).toBe(
      'specific-add',
    );

    caps = cycleCapabilityCell(caps, 'member', 'core-groups-read');
    expect(getCapabilityCellState(caps, 'member', 'core-groups-read')).toBe(
      'specific-remove',
    );

    caps = cycleCapabilityCell(caps, 'member', 'core-groups-read');
    expect(getCapabilityCellState(caps, 'member', 'core-groups-read')).toBe(
      'none',
    );
  });

  it('locks implicit-remove cells', () => {
    const caps = {
      member: { remove: ['core-posts-*'] },
    };
    expect(
      getCapabilityCellState(caps, 'member', 'core-posts-read'),
    ).toBe('implicit-remove');
    expect(cycleCapabilityCell(caps, 'member', 'core-posts-read')).toEqual(
      caps,
    );
  });

  it('allows cycling an explicitly denied wildcard', () => {
    const caps = {
      member: { remove: ['core-posts-*'] },
    };
    expect(
      getCapabilityCellState(caps, 'member', 'core-posts-*'),
    ).toBe('specific-remove');

    const cleared = cycleCapabilityCell(caps, 'member', 'core-posts-*');
    expect(
      getCapabilityCellState(cleared, 'member', 'core-posts-*'),
    ).toBe('none');
    expect(cleared.member?.remove).toEqual([]);
  });

  it('cycles wildcard deny → none → allow', () => {
    let caps = { member: { remove: ['core-groups-*'] } };
    expect(
      getCapabilityCellState(caps, 'member', 'core-groups-*'),
    ).toBe('specific-remove');

    caps = cycleCapabilityCell(caps, 'member', 'core-groups-*');
    expect(
      getCapabilityCellState(caps, 'member', 'core-groups-*'),
    ).toBe('none');

    caps = cycleCapabilityCell(caps, 'member', 'core-groups-*');
    expect(
      getCapabilityCellState(caps, 'member', 'core-groups-*'),
    ).toBe('specific-add');
  });

  it('normalizes redundant explicit adds under wildcards', () => {
    const caps = normalizeGroupCapabilities({
      member: {
        add: [
          'core-posts-create-*',
          'core-posts-create-event',
          'core-posts-create-note',
        ],
      },
    });
    expect(caps.member?.add).toEqual(['core-posts-create-*']);
    expect(
      getCapabilityCellState(caps, 'member', 'core-posts-create-event'),
    ).toBe('implicit-add');
  });

  it('normalizes redundant explicit removes under wildcard deny', () => {
    const caps = normalizeGroupCapabilities({
      member: {
        remove: ['core-posts-*', 'core-posts-read'],
      },
    });
    expect(caps.member?.remove).toEqual(['core-posts-*']);
    expect(
      getCapabilityCellState(caps, 'member', 'core-posts-read'),
    ).toBe('implicit-remove');
  });

  it('shows implicit-add on other relationships when none grants the cap', () => {
    const caps = {
      none: { add: ['core-groups-read'] },
    };
    expect(
      getCapabilityCellState(caps, 'member', 'core-groups-read'),
    ).toBe('implicit-add');
    expect(
      getCapabilityCellState(caps, 'local', 'core-groups-read'),
    ).toBe('implicit-add');
    expect(
      getCapabilityCellState(caps, 'none', 'core-groups-read'),
    ).toBe('specific-add');
  });

  it('locks member cells when none wildcard denies', () => {
    const caps = {
      none: { remove: ['core-posts-*'] },
    };
    expect(
      getCapabilityCellState(caps, 'member', 'core-posts-read'),
    ).toBe('implicit-remove');
    expect(cycleCapabilityCell(caps, 'member', 'core-posts-read')).toEqual(caps);
  });

  it('normalizes redundant member adds when none already grants', () => {
    const caps = normalizeGroupCapabilities({
      none: { add: ['core-groups-read'] },
      member: { add: ['core-groups-read'] },
    });
    expect(caps.member?.add).toEqual([]);
    expect(
      getCapabilityCellState(caps, 'member', 'core-groups-read'),
    ).toBe('implicit-add');
  });

  it('cycles member override when none grants', () => {
    const caps = { none: { add: ['core-groups-read'] } };
    const denied = cycleCapabilityCell(caps, 'member', 'core-groups-read');
    expect(
      getCapabilityCellState(denied, 'member', 'core-groups-read'),
    ).toBe('specific-remove');
    expect(
      isEffectivelyGranted(denied, 'member', 'core-groups-read'),
    ).toBe(false);
    expect(isGrantedByNone(denied, 'core-groups-read')).toBe(true);
  });
});
