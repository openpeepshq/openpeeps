import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PostWithMeta,
  ProfileSettings,
  ProfileWithMeta,
  PublicRsvp,
} from '@openpeepshq/common/types';
import { allpeepDb } from '../../../db';

vi.mock('../../../db', async (importOriginal) => ({
  ...(await importOriginal()),
  allpeepDb: vi.fn(),
}));

vi.mock('../../../profileSettings', () => ({
  findProfileSettings: vi.fn(async (id: string) =>
    levels[id] === undefined
      ? undefined
      : {
          groupNotificationLevels: { [GROUP.id]: levels[id] },
        },
  ),
}));

vi.mock('@openpeepshq/core/profiles', () => ({
  listProfiles: vi.fn(async () => profileRows),
  listGroupMembers: vi.fn(async () =>
    groupMemberRows.map((profile) => ({ profile })),
  ),
  findProfile: vi.fn(async (id: string) =>
    [...profileRows, ...groupMemberRows].find((profile) => profile.id === id),
  ),
}));

import { findProfile, listProfiles } from '@openpeepshq/core/profiles';
import { findProfileSettings } from '../../../profileSettings';
import {
  allowsGroupNotification,
  groupNotificationLevelFor,
} from '../../helpers';
import { jamStartAudience } from './recipients';

const creator = { id: 'creator-1' } as ProfileWithMeta;
const alice = { id: 'alice-1' } as ProfileWithMeta;
const bob = { id: 'bob-1' } as ProfileWithMeta;
const moderator = { id: 'mod-1' } as ProfileWithMeta;
const GROUP = { id: 'group-1' };

const profileRows: ProfileWithMeta[] = [];
const groupMemberRows: ProfileWithMeta[] = [];
const levels: Record<string, string> = {};

vi.mocked(allpeepDb).mockResolvedValue({ db: {} } as never);

const rsvp = (profileId: string, response: string): PublicRsvp =>
  ({
    profile: { id: profileId },
    response,
    createdAt: '2026-01-01T00:00:00.000Z',
  }) as unknown as PublicRsvp;

const jamEvent = (jam: Record<string, unknown>) =>
  ({ type: 'event', jam }) as unknown as PostWithMeta['data'];

const eventPost = (over: Record<string, unknown> = {}): PostWithMeta =>
  ({
    visibility: 'group',
    group: GROUP,
    audience: undefined,
    rsvps: [],
    data: jamEvent({ waitingRoom: false }),
    ...over,
  }) as unknown as PostWithMeta;

beforeEach(() => {
  profileRows.length = 0;
  groupMemberRows.length = 0;
  for (const key of Object.keys(levels)) delete levels[key];
  vi.mocked(allpeepDb).mockResolvedValue({ db: {} } as never);
  vi.mocked(findProfileSettings).mockClear();
  vi.mocked(findProfile).mockClear();
  vi.mocked(listProfiles).mockClear();
});

describe('jamStartAudience', () => {
  it('broadcasts to nobody on a public jam without the opt-in flag', async () => {
    const result = await jamStartAudience(
      creator,
      eventPost({ visibility: 'public' }),
      undefined,
    );
    expect(result.profiles).toEqual([]);
    expect(result.groupId).toBeUndefined();
    expect(listProfiles).not.toHaveBeenCalled();
  });

  it('broadcasts to every profile but the creator once opted in', async () => {
    profileRows.push(creator, alice, bob);
    const result = await jamStartAudience(
      creator,
      eventPost({
        visibility: 'public',
        data: jamEvent({ notifyEveryone: true }),
      }),
      undefined,
    );
    expect(result.profiles).toEqual([alice, bob]);
  });

  it('broadcasts the same instance blast for a local jam once opted in', async () => {
    // `local` shares the `['local', 'public']` community-wide branch and the
    // `isCommunityWideVisibility` gate, so its opt-in blast must match
    // `public` end to end (profiles minus creator, no groupId).
    profileRows.push(creator, alice, bob);
    const result = await jamStartAudience(
      creator,
      eventPost({
        visibility: 'local',
        group: undefined,
        data: jamEvent({ notifyEveryone: true }),
      }),
      undefined,
    );
    expect(result.profiles).toEqual([alice, bob]);
    expect(result.groupId).toBeUndefined();
    expect(listProfiles).toHaveBeenCalled();
  });

  it('notifies group members by default and passes the group id through', async () => {
    groupMemberRows.push(alice, bob);
    const result = await jamStartAudience(creator, eventPost(), undefined);
    expect(result.profiles).toEqual([alice, bob]);
    expect(result.groupId).toBe(GROUP.id);
  });

  it('silences a member whose group level is off', async () => {
    groupMemberRows.push(alice, bob);
    levels[bob.id] = 'off';
    const result = await jamStartAudience(creator, eventPost(), undefined);
    expect(result.profiles).toEqual([alice]);
  });

  it('keeps only RSVPd members at mostRelevant', async () => {
    groupMemberRows.push(alice, bob);
    levels[alice.id] = 'mostRelevant';
    levels[bob.id] = 'mostRelevant';
    const post = eventPost({
      rsvps: [rsvp(alice.id, 'tentative'), rsvp(bob.id, 'no')],
    });
    const result = await jamStartAudience(creator, post, undefined);
    expect(result.profiles).toEqual([alice]);
  });

  it('notifies only the direct audience and skips the creator', async () => {
    const result = await jamStartAudience(
      creator,
      eventPost({
        visibility: 'direct',
        group: undefined,
        audience: [creator, alice],
      }),
      undefined,
    );
    expect(result.profiles).toEqual([alice]);
    expect(result.groupId).toBeUndefined();
  });

  it('notifies nobody on a group jam whose post.group is missing', async () => {
    groupMemberRows.push(alice, bob);
    const result = await jamStartAudience(
      creator,
      eventPost({ visibility: 'group', group: undefined }),
      undefined,
    );
    expect(result.profiles).toEqual([]);
    expect(result.groupId).toBeUndefined();
  });

  it('returns nothing when the post is not a jam event', async () => {
    const result = await jamStartAudience(
      creator,
      {
        visibility: 'group',
        group: GROUP,
        data: { type: 'note' },
      } as unknown as PostWithMeta,
      undefined,
    );
    expect(result.profiles).toEqual([]);
  });

  it('notifies designated moderators and speakers on a group jam', async () => {
    profileRows.push(moderator);
    groupMemberRows.push(alice, bob);
    const result = await jamStartAudience(
      creator,
      eventPost({ data: jamEvent({ moderators: [moderator.id, alice.id] }) }),
      undefined,
    );
    // The moderator is appended once; a member who is also designated is not
    // duplicated.
    expect(result.profiles).toEqual([alice, bob, moderator]);
    expect(findProfile).toHaveBeenCalledWith(moderator.id);
  });

  it('does not re-fetch a designated recipient who is already in the audience', async () => {
    groupMemberRows.push(alice, bob);
    const result = await jamStartAudience(
      creator,
      eventPost({ data: jamEvent({ moderators: [alice.id] }) }),
      undefined,
    );
    expect(result.profiles).toEqual([alice, bob]);
    // alice is a group member: her profile was already loaded for the
    // audience pass, so the designated pass must reuse it, not query again.
    expect(findProfile).not.toHaveBeenCalledWith(alice.id);
    expect(findProfile).not.toHaveBeenCalled();
  });

  it('adds designated speakers who are not group members', async () => {
    profileRows.push(bob);
    groupMemberRows.push(alice);
    const result = await jamStartAudience(
      creator,
      eventPost({ data: jamEvent({ moderators: [], speakers: [bob.id] }) }),
      undefined,
    );
    expect(result.profiles).toEqual([alice, bob]);
  });

  it('still notifies moderators whose group level is off', async () => {
    profileRows.push(moderator);
    groupMemberRows.push(alice);
    levels[moderator.id] = 'off';
    const result = await jamStartAudience(
      creator,
      eventPost({ data: jamEvent({ moderators: [moderator.id] }) }),
      undefined,
    );
    expect(result.profiles).toEqual([alice, moderator]);
  });

  it('notifies moderators without an RSVP at mostRelevant', async () => {
    profileRows.push(moderator);
    groupMemberRows.push(alice, bob);
    levels[alice.id] = 'mostRelevant';
    levels[bob.id] = 'mostRelevant';
    const result = await jamStartAudience(
      creator,
      eventPost({
        rsvps: [rsvp(alice.id, 'yes')],
        data: jamEvent({ moderators: [moderator.id] }),
      }),
      undefined,
    );
    expect(result.profiles).toEqual([alice, moderator]);
  });

  it('notifies designated moderators and speakers on a direct jam', async () => {
    profileRows.push(moderator);
    const result = await jamStartAudience(
      creator,
      eventPost({
        visibility: 'direct',
        group: undefined,
        audience: [alice],
        data: jamEvent({ moderators: [moderator.id], speakers: [alice.id] }),
      }),
      undefined,
    );
    expect(result.profiles).toEqual([alice, moderator]);
  });

  it('skips the creator when they are a designated moderator', async () => {
    groupMemberRows.push(alice);
    const result = await jamStartAudience(
      creator,
      eventPost({ data: jamEvent({ moderators: [creator.id, alice.id] }) }),
      undefined,
    );
    expect(result.profiles).toEqual([alice]);
  });
});

/**
 * End-to-end shape of the double gate: what jamStartAudience offers must
 * survive the allowsGroupNotification call that maybeCreateNotification
 * performs with the same profile settings and groupId. Running both halves
 * on the same objects pins the invariant that an RSVP'd member is not
 * silently dropped by either side (a future edit to either one fails here).
 */
describe('jamStartAudience + allowsGroupNotification compose', () => {
  const survivingIds = async (
    profiles: ProfileWithMeta[],
    groupId?: string,
  ) => {
    const settingsById = new Map<string, ProfileSettings | undefined>();
    for (const profile of profiles) {
      settingsById.set(profile.id, await findProfileSettings(profile.id));
    }
    return profiles
      .filter((profile) =>
        allowsGroupNotification({
          level: groupNotificationLevelFor(
            settingsById.get(profile.id),
            groupId,
          ),
          type: 'jamStarted',
          followsAuthor: false,
        }),
      )
      .map((profile) => profile.id);
  };

  it('lets an RSVPd member through both halves at mostRelevant', async () => {
    groupMemberRows.push(alice, bob);
    levels[alice.id] = 'mostRelevant';
    levels[bob.id] = 'mostRelevant';
    const post = eventPost({
      rsvps: [rsvp(alice.id, 'tentative'), rsvp(bob.id, 'no')],
    });
    const { profiles, groupId } = await jamStartAudience(
      creator,
      post,
      undefined,
    );
    expect(profiles).toEqual([alice]);
    expect(await survivingIds(profiles, groupId)).toEqual([alice.id]);
  });

  it('silences an off-level member in the composed path', async () => {
    groupMemberRows.push(alice, bob);
    levels[bob.id] = 'off';
    const { profiles, groupId } = await jamStartAudience(
      creator,
      eventPost(),
      undefined,
    );
    expect(await survivingIds(profiles, groupId)).toEqual([alice.id]);
  });
});
