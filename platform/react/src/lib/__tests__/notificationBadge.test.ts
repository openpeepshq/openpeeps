import { describe, expect, it } from 'vitest';
import type { InfiniteData } from '@tanstack/react-query';
import type { PublicNotification } from '@openpeepshq/common/types';
import {
  isNotificationsFeedQueryKey,
  markNotificationPagesSeen,
} from '../notificationBadge';

const notification = (id: string, seen?: boolean): PublicNotification =>
  ({ id, seen, type: 'follow' }) as PublicNotification;

describe('isNotificationsFeedQueryKey', () => {
  it('matches the infinite feed key', () => {
    expect(
      isNotificationsFeedQueryKey([
        'profiles',
        'current',
        'notifications',
        { limit: 15 },
      ]),
    ).toBe(true);
  });

  it('ignores stats and types keys', () => {
    expect(
      isNotificationsFeedQueryKey([
        'profiles',
        'current',
        'notifications',
        'stats',
      ]),
    ).toBe(false);
    expect(
      isNotificationsFeedQueryKey([
        'profiles',
        'current',
        'notifications',
        'types',
      ]),
    ).toBe(false);
  });
});

describe('markNotificationPagesSeen', () => {
  it('sets seen on every cached page without dropping pages', () => {
    const current: InfiniteData<PublicNotification[]> = {
      pageParams: [undefined, 'n2'],
      pages: [
        [notification('n1', false), notification('n2', true)],
        [notification('n3')],
      ],
    };

    expect(markNotificationPagesSeen(current)).toEqual({
      pageParams: [undefined, 'n2'],
      pages: [
        [notification('n1', true), notification('n2', true)],
        [notification('n3', true)],
      ],
    });
  });

  it('returns undefined data unchanged', () => {
    expect(markNotificationPagesSeen(undefined)).toBeUndefined();
  });
});
