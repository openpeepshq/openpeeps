import { describe, expect, it } from 'vitest';
import {
  getGroupPostsVisibilityValue,
  getGroupVisibilityValue,
  getGroupWhoCanJoinValue,
  getGroupWhoCanPostEventsValue,
  getGroupWhoCanPostValue,
  setGroupPostsVisibility,
  setGroupVisibility,
  setGroupWhoCanJoin,
  setGroupWhoCanPost,
  setGroupWhoCanPostEvents,
} from '../groupCapabilityHelpers';
import {
  isEffectivelyGranted,
  toggleRelationshipCapability,
} from '../groupCapabilityMatrix';
import type { GroupData } from '@openpeepshq/common/types';

const baseCapabilities = (): GroupData['capabilities'] => ({
  none: {
    add: ['core-groups-read', 'core-posts-read'],
  },
  local: {
    add: ['core-groups-join'],
  },
  member: {
    add: ['core-posts-create-*'],
    remove: ['core-posts-create-event'],
  },
  moderator: {
    add: ['core-posts-create-*'],
  },
  admin: {
    add: ['core-posts-*', 'core-groups-read'],
  },
});

describe('groupCapabilityHelpers ↔ matrix sync', () => {
  it('preserves member.remove when simple visibility changes', () => {
    const groupData = { capabilities: baseCapabilities() };
    setGroupVisibility(groupData, 'local');

    expect(groupData.capabilities.member?.remove).toEqual([
      'core-posts-create-event',
    ]);
    expect(getGroupVisibilityValue(groupData.capabilities)).toBe('local');
    expect(getGroupWhoCanPostEventsValue(groupData.capabilities)).toBe(
      'admin',
    );
  });

  it('reads simple values through wildcards set in advanced', () => {
    const capabilities: GroupData['capabilities'] = {
      none: { add: ['core-groups-*', 'core-posts-*'] },
      local: { add: ['core-groups-*'] },
      member: { add: ['core-posts-create-*'] },
    };

    expect(getGroupVisibilityValue(capabilities)).toBe('public');
    expect(getGroupPostsVisibilityValue(capabilities)).toBe('public');
    expect(getGroupWhoCanJoinValue(capabilities)).toBe('open');
    expect(getGroupWhoCanPostValue(capabilities)).toBe('members');
  });

  it('round-trips simple who-can-post into advanced create-*', () => {
    const groupData = { capabilities: baseCapabilities() };
    setGroupWhoCanPost(groupData, 'admin');
    expect(
      isEffectivelyGranted(
        groupData.capabilities,
        'member',
        'core-posts-create-note',
      ),
    ).toBe(false);
    expect(getGroupWhoCanPostValue(groupData.capabilities)).toBe('admin');

    setGroupWhoCanPost(groupData, 'members');
    expect(
      groupData.capabilities.member?.add?.includes('core-posts-create-*'),
    ).toBe(true);
    expect(getGroupWhoCanPostValue(groupData.capabilities)).toBe('members');
  });

  it('round-trips event exclusion via remove between simple and advanced', () => {
    const groupData = {
      capabilities: {
        member: { add: ['core-posts-create-*'] },
      } satisfies GroupData['capabilities'],
    };

    setGroupWhoCanPostEvents(groupData, 'admin');
    expect(
      isEffectivelyGranted(
        groupData.capabilities,
        'member',
        'core-posts-create-event',
      ),
    ).toBe(false);
    expect(getGroupWhoCanPostEventsValue(groupData.capabilities)).toBe(
      'admin',
    );

    const afterAdvanced = toggleRelationshipCapability(
      groupData.capabilities,
      'member',
      'core-posts-create-event',
    );
    expect(
      isEffectivelyGranted(afterAdvanced, 'member', 'core-posts-create-event'),
    ).toBe(true);
    expect(getGroupWhoCanPostEventsValue(afterAdvanced)).toBe('members');
  });

  it('keeps join and posts visibility when toggling unrelated simple fields', () => {
    const groupData = { capabilities: baseCapabilities() };
    setGroupWhoCanJoin(groupData, 'closed');
    setGroupPostsVisibility(groupData, 'private');

    expect(getGroupWhoCanJoinValue(groupData.capabilities)).toBe('closed');
    expect(getGroupPostsVisibilityValue(groupData.capabilities)).toBe(
      'private',
    );
    expect(groupData.capabilities.member?.remove).toEqual([
      'core-posts-create-event',
    ]);
    expect(
      groupData.capabilities.moderator?.add?.includes('core-posts-create-*'),
    ).toBe(true);
  });
});
