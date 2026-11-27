import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findProfile, getGroupRelationships } = vi.hoisted(() => ({
  findProfile: vi.fn(async (): Promise<unknown> => null),
  getGroupRelationships: vi.fn((): ['none'] => ['none']),
}));

// `checkCapabilities` is the real pure predicate; this stand-in keeps the
// role-level `core-posts-update` gate deterministic without loading the full
// capabilities config in a unit test.
vi.mock('@openpeepshq/common/lib', () => ({
  checkCapabilities: (
    caps: string[],
    roleCaps: { add?: string[] } = { add: [] },
  ) => ({ success: caps.every((c) => (roleCaps.add ?? []).includes(c)) }),
  getGroupRelationships,
}));

vi.mock('../profiles', () => ({ findProfile }));

import { validateEventCoOrganizers } from './eventCollaborators';

const profile = (id: string, type: 'local' | 'guest' | 'federated' = 'local') =>
  ({ id, type, memberships: [] }) as never;

const caller = (id: string, roles?: { capabilities: { add: string[] } }[]) =>
  ({ id, roles }) as never;

const publicPost = () => ({ id: 'p1', visibility: 'public' as const });
const groupPost = () =>
  ({
    id: 'p1',
    visibility: 'group' as const,
    group: { id: 'g1' },
  }) as never;

const expectError = async (promise: Promise<unknown>, errorKey: string) => {
  await expect(promise).rejects.toMatchObject({ errorKey });
};
const expectNoResolves = () => expect(findProfile).not.toHaveBeenCalled();

describe('validateEventCoOrganizers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGroupRelationships.mockReturnValue(['none']);
  });

  it('returns the stored list untouched when the list is unchanged', async () => {
    const result = await validateEventCoOrganizers({
      caller: caller('organizer'),
      organizerId: 'organizer',
      post: publicPost(),
      previous: ['a', 'b'],
      next: ['b', 'a'],
    });
    expect(result).toEqual(['a', 'b']);
    expectNoResolves();
  });

  it('lets the organizer add a local profile that can see the event', async () => {
    findProfile.mockResolvedValue(profile('target'));
    const result = await validateEventCoOrganizers({
      caller: caller('organizer'),
      organizerId: 'organizer',
      post: publicPost(),
      previous: [],
      next: ['target'],
    });
    expect(result).toEqual(['target']);
    expect(findProfile).toHaveBeenCalledWith('target');
  });

  it('rejects a caller that is neither organizer, co-organizer, nor role-level', async () => {
    findProfile.mockResolvedValue(profile('target'));
    await expectError(
      validateEventCoOrganizers({
        caller: caller('stranger', [{ capabilities: { add: [] } }]),
        organizerId: 'organizer',
        post: publicPost(),
        previous: [],
        next: ['target'],
      }),
      'error.eventCoOrganizersForbidden',
    );
  });

  it('lets a co-organizer add another local profile', async () => {
    findProfile.mockResolvedValue(profile('third'));
    const result = await validateEventCoOrganizers({
      caller: caller('co1'),
      organizerId: 'organizer',
      post: publicPost(),
      previous: ['co1'],
      next: ['co1', 'third'],
    });
    expect(result).toEqual(['co1', 'third']);
  });

  it('lets a co-organizer step down (remove self only)', async () => {
    // The remaining list entry (`co2`) is re-validated like any other target.
    findProfile.mockImplementation(async (id: string) => profile(id));
    const previous = ['co1', 'co2'];
    const result = await validateEventCoOrganizers({
      caller: caller('co1'),
      organizerId: 'organizer',
      post: publicPost(),
      previous,
      next: ['co2'],
    });
    // The self-remove diff yields exactly one fewer entry.
    expect(result).toEqual(['co2']);
    expect(result.length).toBe(previous.length - 1);
  });

  it('blocks a co-organizer from removing another co-organizer', async () => {
    await expectError(
      validateEventCoOrganizers({
        caller: caller('co1'),
        organizerId: 'organizer',
        post: publicPost(),
        previous: ['co1', 'co2'],
        next: ['co1', 'third'],
      }),
      'error.eventCoOrganizersForbidden',
    );
  });

  it('lets a role-level caller (core-posts-update) change the list', async () => {
    findProfile.mockResolvedValue(profile('target'));
    const result = await validateEventCoOrganizers({
      caller: caller('admin', [
        { capabilities: { add: ['core-posts-update'] } },
      ]),
      organizerId: 'organizer',
      post: publicPost(),
      previous: ['co1'],
      next: ['target'],
    });
    expect(result).toEqual(['target']);
  });

  it('rejects an unknown target id', async () => {
    findProfile.mockResolvedValue(null);
    await expectError(
      validateEventCoOrganizers({
        caller: caller('organizer'),
        organizerId: 'organizer',
        post: publicPost(),
        previous: [],
        next: ['ghost'],
      }),
      'error.eventCoOrganizerInvalid',
    );
  });

  it('rejects a federated target', async () => {
    findProfile.mockResolvedValue(profile('fed', 'federated'));
    await expectError(
      validateEventCoOrganizers({
        caller: caller('organizer'),
        organizerId: 'organizer',
        post: publicPost(),
        previous: [],
        next: ['fed'],
      }),
      'error.eventCoOrganizerInvalid',
    );
  });

  it('rejects a local target that cannot see a group event', async () => {
    findProfile.mockResolvedValue(profile('outsider'));
    getGroupRelationships.mockReturnValue(['none']);
    await expectError(
      validateEventCoOrganizers({
        caller: caller('organizer'),
        organizerId: 'organizer',
        post: groupPost(),
        previous: [],
        next: ['outsider'],
      }),
      'error.eventCoOrganizerInvisible',
    );
  });

  it('allows a local target that is a member of the event group', async () => {
    findProfile.mockResolvedValue(profile('member'));
    getGroupRelationships.mockReturnValue(['member']);
    const result = await validateEventCoOrganizers({
      caller: caller('organizer'),
      organizerId: 'organizer',
      post: groupPost(),
      previous: [],
      next: ['member'],
    });
    expect(result).toEqual(['member']);
  });

  it('accepts any local target on a public event without a group-member check', async () => {
    findProfile.mockResolvedValue(profile('anyone'));
    const result = await validateEventCoOrganizers({
      caller: caller('organizer'),
      organizerId: 'organizer',
      post: publicPost(),
      previous: [],
      next: ['anyone'],
    });
    expect(result).toEqual(['anyone']);
    // The group-membership gate must never run for public/local events.
    expect(getGroupRelationships).not.toHaveBeenCalled();
  });

  it('accepts any local target on a local event without a group-member check', async () => {
    findProfile.mockResolvedValue(profile('anyone'));
    const result = await validateEventCoOrganizers({
      caller: caller('organizer'),
      organizerId: 'organizer',
      post: { id: 'p1', visibility: 'local' as const },
      previous: [],
      next: ['anyone'],
    });
    expect(result).toEqual(['anyone']);
    expect(getGroupRelationships).not.toHaveBeenCalled();
  });

  it('skips validating the caller id itself (self-add needs no lookup)', async () => {
    // The organizer naming themselves is allowed by design: the caller-skip
    // path must not resolve the caller (it would 422 on an unknown id), and
    // the other entries are still validated.
    findProfile.mockResolvedValue(profile('target'));
    const result = await validateEventCoOrganizers({
      caller: caller('organizer'),
      organizerId: 'organizer',
      post: publicPost(),
      previous: [],
      next: ['organizer', 'target'],
    });
    expect(result).toEqual(['organizer', 'target']);
    expect(findProfile).not.toHaveBeenCalledWith('organizer');
    expect(findProfile).toHaveBeenCalledTimes(1);
  });

  it('still rejects an unknown non-caller target when the caller id is present', async () => {
    findProfile.mockResolvedValue(null);
    await expectError(
      validateEventCoOrganizers({
        caller: caller('organizer'),
        organizerId: 'organizer',
        post: publicPost(),
        previous: [],
        next: ['organizer', 'ghost'],
      }),
      'error.eventCoOrganizerInvalid',
    );
  });
});
