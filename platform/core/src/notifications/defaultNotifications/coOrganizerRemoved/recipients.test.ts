import { describe, expect, it } from 'vitest';
import { coOrganizersRemovedToNotify } from './recipients';

describe('coOrganizersRemovedToNotify', () => {
  it('notifies co-organizers removed since the last save', () => {
    expect(
      coOrganizersRemovedToNotify(['co-a', 'co-b'], ['co-a'], 'organizer'),
    ).toEqual(['co-b']);
  });

  it('excludes the sender when they step down', () => {
    expect(coOrganizersRemovedToNotify(['co-a', 'organizer'], ['co-a'], 'organizer')).toEqual(
      [],
    );
  });

  it('returns nothing when the list is unchanged', () => {
    expect(coOrganizersRemovedToNotify(['co-a'], ['co-a'], 'organizer')).toEqual([]);
  });

  it('does not re-notify co-organizers who remain in the list', () => {
    expect(
      coOrganizersRemovedToNotify(['co-a', 'co-b'], ['co-a', 'co-b'], 'organizer'),
    ).toEqual([]);
  });
});
