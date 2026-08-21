import { describe, expect, it } from 'vitest';
import {
  groupCapabilityEditorGroups,
  isCoveredByWildcard,
  isEffectivelyGranted,
  toggleRelationshipCapability,
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

  it('excludes covered leaves via remove when toggled off', () => {
    const caps = {
      member: { add: ['core-posts-create-*'] },
    };
    const next = toggleRelationshipCapability(
      caps,
      'member',
      'core-posts-create-event',
    );
    expect(isEffectivelyGranted(next, 'member', 'core-posts-create-event')).toBe(
      false,
    );
    expect(next.member?.remove).toEqual(['core-posts-create-event']);
  });
});
