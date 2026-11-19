import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta } from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import * as posts from '../posts';
import { hub } from '../events';
import * as waitingRoom from './waitingRoom';
import { roomService } from './livekit';
import * as mutations from './mutations';
import { postsMapping } from '../posts/mapping';
import { liftJamBan, removeParticipant } from './index';

vi.mock('../db', async (importOriginal) => ({
  ...(await importOriginal()),
  allpeepDb: vi.fn().mockResolvedValue({ db: {} }),
}));
vi.mock('./livekit', () => ({
  roomService: vi.fn().mockResolvedValue(undefined),
  listParticipantIds: vi.fn().mockResolvedValue([]),
  reclaimOrphanJamRoom: vi.fn().mockResolvedValue(undefined),
  shouldReclaimJamRoom: vi.fn().mockReturnValue(false),
  stopRecording: vi.fn(),
  stopRtmpStream: vi.fn(),
  JAM_ROOM_EMPTY_TIMEOUT_SEC: 300,
  JAM_ROOM_DEPARTURE_TIMEOUT_SEC: 60,
}));
vi.mock('./mutations', () => ({
  createJamEvent: vi.fn().mockResolvedValue(undefined),
  updateJamRecording: vi.fn(),
}));

const JAM_ID = '01970000-0000-7000-8000-000000000001';
const HOST = '01970000-0000-7000-8000-000000000002';
const GUEST = '01970000-0000-7000-8000-000000000004';
const OTHER = '01970000-0000-7000-8000-000000000005';

const jamEvent = (banned?: string[]): PostWithMeta =>
  ({
    id: JAM_ID,
    profile: { id: HOST },
    data: {
      type: 'event',
      jam: {
        moderators: [HOST],
        videoEnabled: true,
        type: 'video-call',
        ...(banned ? { banned } : {}),
      },
    },
  }) as unknown as PostWithMeta;

const mockDeps = () => {
  vi.mocked(allpeepDb).mockResolvedValue({ db: {} } as never);
  const update = vi
    .spyOn(postsMapping, 'update')
    .mockResolvedValue(undefined as never);
  vi.spyOn(posts, 'findPost').mockResolvedValue(jamEvent() as never);
  vi.spyOn(waitingRoom, 'clearJamAdmittance').mockResolvedValue(undefined);
  vi.spyOn(hub, 'emit').mockResolvedValue(undefined);
  vi.mocked(mutations.createJamEvent).mockResolvedValue(undefined);
  vi.mocked(roomService).mockResolvedValue(undefined);
  return { update };
};

describe('removeParticipant', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('appends the profile to the per-jam ban list', async () => {
    const { update } = mockDeps();
    await removeParticipant(jamEvent(['a']), GUEST);
    expect(update).toHaveBeenCalledWith(
      {},
      JAM_ID,
      expect.objectContaining({
        data: expect.objectContaining({
          jam: expect.objectContaining({ banned: ['a', GUEST] }),
        }),
      }),
    );
  });

  it('does not duplicate a profile that is already banned', async () => {
    const { update } = mockDeps();
    await removeParticipant(jamEvent([GUEST, OTHER]), GUEST);
    expect(update).not.toHaveBeenCalled();
    expect(hub.emit).not.toHaveBeenCalled();
  });

  it('still clears admittance, evicts, and records the kick when already banned', async () => {
    // "Already banned" must stay a persist-skip only: the side effects that
    // matter to the removed person still run, or a future refactor could turn
    // the branch into a full no-op and leave a pending admittee stuck.
    const { update } = mockDeps();
    const livekitRemove = vi.fn().mockResolvedValue(true);
    vi.mocked(roomService).mockResolvedValue({
      removeParticipant: livekitRemove,
    } as never);
    await removeParticipant(jamEvent([GUEST, OTHER]), GUEST, 'rec-1');
    expect(update).not.toHaveBeenCalled();
    expect(waitingRoom.clearJamAdmittance).toHaveBeenCalledWith(
      expect.anything(),
      'rec-1',
      [GUEST],
    );
    expect(livekitRemove).toHaveBeenCalledTimes(1);
    expect(mutations.createJamEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        jamId: JAM_ID,
        type: 'kicked',
        profileId: GUEST,
        recurrenceId: 'rec-1',
      }),
    );
  });

  it('notifies moderators via postUpdated', async () => {
    mockDeps();
    await removeParticipant(jamEvent(), OTHER);
    expect(hub.emit).toHaveBeenCalledWith('postUpdated', expect.anything(), [
      HOST,
    ]);
  });

  it('records a kicked attendance event', async () => {
    mockDeps();
    await removeParticipant(jamEvent(), OTHER, 'rec-1');
    expect(mutations.createJamEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        jamId: JAM_ID,
        type: 'kicked',
        profileId: OTHER,
        recurrenceId: 'rec-1',
      }),
    );
  });

  it('persists the ban and records the kick when the LiveKit eviction throws', async () => {
    // The documented "participant already left" path: roomService resolves but
    // removeParticipant rejects. The ban and the kicked record must still land
    // and the error must be swallowed.
    const { update } = mockDeps();
    const livekitRemove = vi.fn().mockRejectedValue(new Error('gone'));
    vi.mocked(roomService).mockResolvedValue({
      removeParticipant: livekitRemove,
    } as never);
    await removeParticipant(jamEvent(), GUEST, 'rec-1');
    expect(livekitRemove).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      {},
      JAM_ID,
      expect.objectContaining({
        data: expect.objectContaining({
          jam: expect.objectContaining({ banned: [GUEST] }),
        }),
      }),
    );
    expect(mutations.createJamEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'kicked', profileId: GUEST }),
    );
  });

  it('clears the banned profile from the waiting-room admittance hash', async () => {
    mockDeps();
    await removeParticipant(jamEvent(), GUEST, 'rec-1');
    expect(waitingRoom.clearJamAdmittance).toHaveBeenCalledWith(
      expect.anything(),
      'rec-1',
      [GUEST],
    );
  });
});

describe('liftJamBan', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('removes only the target profile from the ban list', async () => {
    const { update } = mockDeps();
    await liftJamBan(jamEvent([GUEST, OTHER]), GUEST);
    expect(update).toHaveBeenCalledWith(
      {},
      JAM_ID,
      expect.objectContaining({
        data: expect.objectContaining({
          jam: expect.objectContaining({ banned: [OTHER] }),
        }),
      }),
    );
    expect(hub.emit).toHaveBeenCalledWith('postUpdated', expect.anything(), [
      HOST,
    ]);
  });

  it('is a no-op for a profile that is not banned', async () => {
    const { update } = mockDeps();
    await liftJamBan(jamEvent([OTHER]), GUEST);
    expect(update).not.toHaveBeenCalled();
    expect(hub.emit).not.toHaveBeenCalled();
  });

  it('lifts the ban for a moderator id without a caller gate', async () => {
    // A moderator can legitimately be banned (removed by another moderator);
    // lifting that ban must go through exactly like any other lift — the
    // endpoint never 403s on the caller's own or a moderator's id.
    const { update } = mockDeps();
    await liftJamBan(jamEvent([HOST]), HOST);
    expect(update).toHaveBeenCalledWith(
      {},
      JAM_ID,
      expect.objectContaining({
        data: expect.objectContaining({
          jam: expect.objectContaining({ banned: [] }),
        }),
      }),
    );
    expect(hub.emit).toHaveBeenCalledWith('postUpdated', expect.anything(), [
      HOST,
    ]);
  });
});
