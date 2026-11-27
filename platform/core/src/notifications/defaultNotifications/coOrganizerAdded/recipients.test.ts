import { describe, expect, it } from 'vitest';
import { coOrganizersAddedToNotify } from './recipients';

describe('coOrganizersAddedToNotify', () => {
  it('notifies only co-organizers added since the last save', () => {
    expect(coOrganizersAddedToNotify(['organizer', 'co-a', 'co-b'], [], 'organizer')).toEqual([
      'co-a',
      'co-b',
    ]);
  });

  it('notifies only genuinely new co-organizers, skipping previous entries', () => {
    expect(
      coOrganizersAddedToNotify(['organizer', 'co-a', 'co-b'], ['co-a'], 'organizer'),
    ).toEqual(['co-b']);
  });

  it('excludes the sender when they add themselves (no self-notification)', () => {
    expect(coOrganizersAddedToNotify(['organizer', 'co'], ['co'], 'organizer')).toEqual(
      [],
    );
  });

  it('returns nothing when the list is unchanged', () => {
    expect(coOrganizersAddedToNotify(['co-a'], ['co-a'], 'organizer')).toEqual([]);
  });

  it('returns nothing when the sender is the only addition', () => {
    expect(coOrganizersAddedToNotify(['co-a', 'organizer'], ['co-a'], 'organizer')).toEqual(
      [],
    );
  });
});
