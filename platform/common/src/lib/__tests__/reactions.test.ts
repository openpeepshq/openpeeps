import { describe, expect, it } from 'vitest';
import {
  AP_LIKE_REACTION,
  activityPubActivityForReaction,
  currentReactionsFromEntries,
} from '../reactions';

describe('activityPubActivityForReaction', () => {
  it('maps only thumbs up and down', () => {
    expect(activityPubActivityForReaction('👍')).toBe('Like');
    expect(activityPubActivityForReaction('👎')).toBe('Dislike');
    expect(activityPubActivityForReaction('❤️')).toBeNull();
  });
});

describe('currentReactionsFromEntries', () => {
  const profileA = { id: 'a' };
  const profileB = { id: 'b' };

  it('keeps multiple emojis from the same profile', () => {
    const current = currentReactionsFromEntries([
      {
        type: 'reaction',
        createdAt: '2026-01-01T00:00:00.000Z',
        data: { reaction: '👍' },
        profile: profileA,
      },
      {
        type: 'reaction',
        createdAt: '2026-01-01T00:01:00.000Z',
        data: { reaction: '👎' },
        profile: profileA,
      },
    ]);
    expect(current).toEqual([
      { reaction: '👍', profile: profileA },
      { reaction: '👎', profile: profileA },
    ]);
  });

  it('applies unreaction per emoji', () => {
    const current = currentReactionsFromEntries([
      {
        type: 'reaction',
        createdAt: '2026-01-01T00:00:00.000Z',
        data: { reaction: AP_LIKE_REACTION },
        profile: profileB,
      },
      {
        type: 'unreaction',
        createdAt: '2026-01-01T00:02:00.000Z',
        data: { reaction: AP_LIKE_REACTION },
        profile: profileB,
      },
    ]);
    expect(current).toEqual([]);
  });
});
