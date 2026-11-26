import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta } from '@openpeepshq/common/types';
import * as posts from '../posts';
import { jamEventsMapping } from './mapping';
import { deleteJamEvent } from './mutations';

vi.mock('../db', async (importOriginal) => ({
  ...(await importOriginal()),
  allpeepDb: vi.fn().mockResolvedValue({ db: {} }),
}));

const JAM_ID = '01970000-0000-7000-8000-000000000001';
const HOST = '01970000-0000-7000-8000-000000000002';
const MODERATOR = '01970000-0000-7000-8000-000000000003';
const AUTHOR = '01970000-0000-7000-8000-000000000004';
const OTHER = '01970000-0000-7000-8000-000000000005';
const MSG_ID = '01970000-0000-7000-8000-000000000006';
const OTHER_JAM_ID = '01970000-0000-7000-8000-000000000007';

const jamPost = (moderators: string[] = [MODERATOR]): PostWithMeta =>
  ({
    id: JAM_ID,
    profile: { id: HOST },
    data: {
      type: 'event',
      jam: {
        moderators,
        videoEnabled: true,
        type: 'video-call',
      },
    },
  }) as unknown as PostWithMeta;

const jamMessage = (overrides: Record<string, unknown> = {}) =>
  ({
    id: MSG_ID,
    jamId: JAM_ID,
    type: 'message',
    profileId: AUTHOR,
    content: 'hello',
    ...overrides,
  }) as never;

// `'key' in opts` (not a destructuring default) so an explicit
// `event: undefined` — “the lookup found nothing” — is distinct from
// “not specified”, which falls back to the happy-path fixture.
const mockDeps = (opts: { event?: unknown; post?: unknown } = {}) => {
  const foundEvent = 'event' in opts ? opts.event : jamMessage();
  const foundPost = 'post' in opts ? opts.post : jamPost();
  const find = vi
    .spyOn(jamEventsMapping, 'find')
    .mockResolvedValue(foundEvent as never);
  const update = vi
    .spyOn(jamEventsMapping, 'update')
    .mockResolvedValue(foundEvent as never);
  const del = vi.spyOn(jamEventsMapping, 'delete').mockResolvedValue(undefined);
  vi.spyOn(posts, 'findPost').mockResolvedValue(foundPost as never);
  return { find, update, del };
};

describe('deleteJamEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets a moderator delete another participant’s message', async () => {
    const { update, del } = mockDeps();
    await expect(deleteJamEvent(MODERATOR, JAM_ID, MSG_ID)).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith({}, MSG_ID, { content: '' });
    expect(del).toHaveBeenCalledWith({}, MSG_ID);
  });

  it('lets the message author delete their own message', async () => {
    const { del } = mockDeps();
    await expect(deleteJamEvent(AUTHOR, JAM_ID, MSG_ID)).resolves.toBe(true);
    expect(del).toHaveBeenCalledWith({}, MSG_ID);
  });

  it('lets the host delete a message', async () => {
    const { del } = mockDeps();
    await expect(deleteJamEvent(HOST, JAM_ID, MSG_ID)).resolves.toBe(true);
    expect(del).toHaveBeenCalledWith({}, MSG_ID);
  });

  // Keeps the `isHost || isModerator || isAuthor` OR-composition symmetric:
  // the host-as-author arm is exercised here (a *different* moderator deletes
  // the *host's* message), so tightening any single arm fails a dedicated case.
  it('lets a moderator delete the host’s own message', async () => {
    const { update, del } = mockDeps({
      event: jamMessage({ profileId: HOST }),
    });
    await expect(deleteJamEvent(MODERATOR, JAM_ID, MSG_ID)).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith({}, MSG_ID, { content: '' });
    expect(del).toHaveBeenCalledWith({}, MSG_ID);
  });

  it('rejects a participant who is neither host, moderator, nor author', async () => {
    const { update, del } = mockDeps();
    await expect(deleteJamEvent(OTHER, JAM_ID, MSG_ID)).rejects.toMatchObject({
      __allPeepError__: true,
      code: 403,
      errorKey: 'error.forbidden',
    });
    expect(update).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('404s when the event belongs to a different jam', async () => {
    const { update, del } = mockDeps();
    await expect(
      deleteJamEvent(MODERATOR, OTHER_JAM_ID, MSG_ID),
    ).rejects.toMatchObject({
      __allPeepError__: true,
      code: 404,
      errorKey: 'error.jamNotFound',
    });
    expect(update).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('404s when the event is not a chat message', async () => {
    const { update, del } = mockDeps({ event: jamMessage({ type: 'join' }) });
    await expect(
      deleteJamEvent(MODERATOR, JAM_ID, MSG_ID),
    ).rejects.toMatchObject({
      __allPeepError__: true,
      code: 404,
      errorKey: 'error.jamNotFound',
    });
    expect(update).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('404s when the event does not exist (re-delete)', async () => {
    const { update, del } = mockDeps({ event: undefined });
    await expect(
      deleteJamEvent(MODERATOR, JAM_ID, MSG_ID),
    ).rejects.toMatchObject({
      __allPeepError__: true,
      code: 404,
      errorKey: 'error.jamNotFound',
    });
    expect(update).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('404s when the jam post is missing', async () => {
    const { update, del } = mockDeps({ post: undefined });
    await expect(
      deleteJamEvent(MODERATOR, JAM_ID, MSG_ID),
    ).rejects.toMatchObject({
      __allPeepError__: true,
      code: 404,
      errorKey: 'error.jamNotFound',
    });
    expect(update).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });
});
