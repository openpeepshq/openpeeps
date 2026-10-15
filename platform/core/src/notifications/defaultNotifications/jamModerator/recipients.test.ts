import { describe, expect, it } from 'vitest';
import { jamModeratorsToNotify } from './recipients';

describe('jamModeratorsToNotify', () => {
  it('skips the creator on create', () => {
    expect(jamModeratorsToNotify(['creator', 'mod-a'], 'creator')).toEqual([
      'mod-a',
    ]);
  });

  it('notifies only moderators added since the last save', () => {
    expect(
      jamModeratorsToNotify(['creator', 'mod-a', 'mod-b'], 'creator', [
        'creator',
        'mod-a',
      ]),
    ).toEqual(['mod-b']);
  });

  it('returns nothing when the moderator list is unchanged', () => {
    expect(
      jamModeratorsToNotify(['creator', 'mod-a'], 'creator', [
        'creator',
        'mod-a',
      ]),
    ).toEqual([]);
  });
});
