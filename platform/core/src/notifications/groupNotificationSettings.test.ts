import { describe, expect, it } from 'vitest';
import type { ProfileSettings } from '@openpeepshq/common/types';
import { allowsGroupNotification, groupNotificationLevelFor } from './helpers';

const settings = {
  groupNotificationLevels: {
    quiet: 'off',
    followed: 'mostRelevant',
  },
} as unknown as ProfileSettings;

describe('group notification levels', () => {
  it('treats a missing group as all activity', () => {
    expect(groupNotificationLevelFor(settings, 'other')).toBe('all');
    expect(groupNotificationLevelFor(undefined, 'quiet')).toBe('all');
    expect(groupNotificationLevelFor(settings, null)).toBe('all');
  });

  it('reads a saved level for that group', () => {
    expect(groupNotificationLevelFor(settings, 'quiet')).toBe('off');
    expect(groupNotificationLevelFor(settings, 'followed')).toBe(
      'mostRelevant',
    );
  });

  it('lets account settings decide notifications that are not group-scoped', () => {
    expect(
      allowsGroupNotification({
        level: 'off',
        type: 'mention',
        followsAuthor: false,
      }),
    ).toBe(true);
  });

  it('drops every group event when the group is off', () => {
    for (const type of [
      'newGroupPost',
      'groupMemberJoined',
      'groupMemberLeft',
    ]) {
      expect(
        allowsGroupNotification({
          level: 'off',
          type,
          followsAuthor: true,
        }),
      ).toBe(false);
    }
  });

  it('keeps posts from followed people when the group is set to most relevant', () => {
    expect(
      allowsGroupNotification({
        level: 'mostRelevant',
        type: 'newGroupPost',
        followsAuthor: true,
      }),
    ).toBe(true);
    expect(
      allowsGroupNotification({
        level: 'mostRelevant',
        type: 'newGroupPost',
        followsAuthor: false,
      }),
    ).toBe(false);
    expect(
      allowsGroupNotification({
        level: 'mostRelevant',
        type: 'groupMemberJoined',
        followsAuthor: true,
      }),
    ).toBe(false);
  });
});
