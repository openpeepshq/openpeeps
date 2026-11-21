import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GroupNotificationLevel,
  ProfileWithMeta,
  PublicProfile,
} from '@openpeepshq/common/types';
import { findProfileSettings } from '../profileSettings';

const createMock = vi.fn();

vi.mock('../db', async (importOriginal) => ({
  ...(await importOriginal()),
  allpeepDb: vi.fn(async () => ({ db: {} })),
}));

vi.mock('./mapping', async (importOriginal) => ({
  ...(await importOriginal()),
  notificationsMapping: {
    create: (db: unknown, data: unknown) => createMock(db, data),
  },
}));

vi.mock('../events', async (importOriginal) => ({
  ...(await importOriginal()),
  // A Proxy so every method (on/once/emit/off/removeAllListeners/…) is a
  // no-op: the real default-notification handler modules register listeners
  // on `hub` at import time, and none of that matters for this unit.
  hub: new Proxy({}, { get: () => async () => {} }),
}));

vi.mock('../profiles', () => ({
  findProfile: vi.fn(async (id: string) =>
    profilesById[id] ? { ...profilesById[id], following: [] } : undefined,
  ),
}));

vi.mock('../profileSettings', () => ({
  findProfileSettings: vi.fn(async (id: string) =>
    settingsById[id] === undefined
      ? undefined
      : ({
          // A level is only present for a group with a saved preference; a
          // missing level is the `all` default.
          groupNotificationLevels: { [GROUP_ID]: settingsById[id] },
        } as never),
  ),
}));

import { maybeCreateNotification } from './mutations';

const GROUP_ID = 'group-1';
const profilesById: Record<string, ProfileWithMeta> = {};
const settingsById: Record<string, GroupNotificationLevel> = {};

const member = (id: string): ProfileWithMeta =>
  ({ id }) as unknown as ProfileWithMeta;
const publicProfile = (id: string): PublicProfile => ({ id }) as never;
const notify = (profileId: string, groupId: string) =>
  maybeCreateNotification(publicProfile(profileId), {
    type: 'jamStarted',
    fromProfileId: 'creator-1',
    postId: 'post-1',
    groupId,
  });

beforeEach(() => {
  for (const key of Object.keys(profilesById)) delete profilesById[key];
  for (const key of Object.keys(settingsById)) delete settingsById[key];
  createMock.mockReset().mockResolvedValue({ id: 'n-1' } as never);
});

describe('maybeCreateNotification jamStarted delivery gate', () => {
  it('delivers to a group member at the default `all` level', async () => {
    // No saved level for the group — the `all` default.
    profilesById['member-1'] = member('member-1');
    settingsById['member-1'] = 'all';
    await notify('member-1', GROUP_ID);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        profileId: 'member-1',
        type: 'jamStarted',
        groupId: GROUP_ID,
      }),
    );
  });

  it('drops a designated moderator whose group is `off`', async () => {
    // The audience builder offers a designated moderator unconditionally
    // (jamStartAudience never level-gates them); the delivery pipeline is
    // where the `off` gate lives. This pins the delivered behavior: an `off`
    // group silences jam-start alerts even for designated recipients.
    profilesById['mod-1'] = member('mod-1');
    settingsById['mod-1'] = 'off';
    await notify('mod-1', GROUP_ID);
    expect(createMock).not.toHaveBeenCalled();
    expect(findProfileSettings).toHaveBeenCalledWith('mod-1');
  });

  it('delivers a designated moderator when the group is `mostRelevant`', async () => {
    // At mostRelevant the pipeline defers jamStarted to the handler (the
    // audience builder already filtered for relevance), so a designated
    // recipient survives even without an RSVP.
    profilesById['mod-2'] = member('mod-2');
    settingsById['mod-2'] = 'mostRelevant';
    await notify('mod-2', GROUP_ID);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('creates no notification when the profile is missing', async () => {
    settingsById['ghost-1'] = 'all';
    await notify('ghost-1', GROUP_ID);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates no notification when profile settings are missing', async () => {
    profilesById['member-2'] = member('member-2');
    await notify('member-2', GROUP_ID);
    expect(createMock).not.toHaveBeenCalled();
  });
});
