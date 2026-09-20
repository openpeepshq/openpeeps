import { describe, expect, it } from 'vitest';
import { profileActivitySummarySchema } from '../stats';

const emptySummary = {
  postsCount: 0,
  repliesCount: 0,
  eventsCount: 0,
  reactionsGiven: 0,
  reactionsReceived: 0,
  repostsCount: 0,
  repostsReceived: 0,
  repliesReceived: 0,
  rsvpsCount: 0,
  bookmarksCount: 0,
  groupsCount: 0,
  topPosts: [],
};

describe('profileActivitySummarySchema', () => {
  it('accepts empty counts and no top posts', () => {
    expect(profileActivitySummarySchema.parse(emptySummary)).toEqual(
      emptySummary,
    );
  });

  it('rejects negative counts and more than five top posts', () => {
    expect(
      profileActivitySummarySchema.safeParse({
        ...emptySummary,
        postsCount: -1,
      }).success,
    ).toBe(false);

    expect(
      profileActivitySummarySchema.safeParse({
        ...emptySummary,
        topPosts: [{}, {}, {}, {}, {}, {}],
      }).success,
    ).toBe(false);
  });
});
