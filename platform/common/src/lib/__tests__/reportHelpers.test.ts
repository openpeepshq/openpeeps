import { describe, expect, it } from 'vitest';
import { isSelfReport } from '../reportHelpers';

describe('isSelfReport', () => {
  const me = 'profile-me';
  const other = 'profile-other';

  it('rejects reporting your own profile', () => {
    expect(isSelfReport(me, me, [])).toBe(true);
  });

  it('rejects reporting a post you authored', () => {
    expect(isSelfReport(me, other, [me])).toBe(true);
  });

  it('allows reporting someone else and their posts', () => {
    expect(isSelfReport(me, other, [other])).toBe(false);
  });

  it('allows a profile-only report of someone else', () => {
    expect(isSelfReport(me, other, [])).toBe(false);
  });
});
