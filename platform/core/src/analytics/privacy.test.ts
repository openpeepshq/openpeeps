import { describe, expect, it } from 'vitest';
import { isAnalyticsTopPostEligible, isPublicAnalyticsGroup } from './privacy';

describe('isPublicAnalyticsGroup', () => {
  it('treats core-groups-read on none as public', () => {
    expect(
      isPublicAnalyticsGroup({
        capabilities: { none: { add: ['core-groups-read'] } },
      }),
    ).toBe(true);
  });

  it('treats missing capabilities as private', () => {
    expect(isPublicAnalyticsGroup({})).toBe(false);
  });
});

describe('isAnalyticsTopPostEligible', () => {
  it('excludes direct messages', () => {
    expect(isAnalyticsTopPostEligible('direct', [])).toBe(false);
  });

  it('allows public and local posts with no group', () => {
    expect(isAnalyticsTopPostEligible('public', [])).toBe(true);
    expect(isAnalyticsTopPostEligible('local', [])).toBe(true);
  });

  it('allows posts in public groups', () => {
    expect(
      isAnalyticsTopPostEligible('group', [
        { capabilities: { none: { add: ['core-groups-read'] } } },
      ]),
    ).toBe(true);
  });

  it('excludes posts in private groups', () => {
    expect(isAnalyticsTopPostEligible('group', [{}])).toBe(false);
    expect(
      isAnalyticsTopPostEligible('group', [
        { capabilities: { none: { add: ['core-groups-read'] } } },
        {},
      ]),
    ).toBe(false);
  });
});
