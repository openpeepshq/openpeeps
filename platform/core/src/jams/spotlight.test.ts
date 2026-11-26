import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta } from '@openpeepshq/common/types';
import { setJamSpotlight } from './spotlight';
import { roomService } from './livekit';

vi.mock('./livekit', () => ({
  roomService: vi.fn(),
}));

const JAM_ID = '01970000-0000-7000-8000-000000000001';
const SPOTLIT_ID = '01970000-0000-7000-8000-000000000002';

const jamEvent = (profileId: string): PostWithMeta =>
  ({
    id: JAM_ID,
    profile: { id: profileId },
    data: { type: 'event', jam: { moderators: [profileId] } },
  }) as unknown as PostWithMeta;

const mockRoomService = () => {
  const listRooms = vi.fn();
  const updateRoomMetadata = vi.fn(async () => ({}));
  vi.mocked(roomService).mockResolvedValue({
    listRooms,
    updateRoomMetadata,
  } as unknown as Awaited<ReturnType<typeof roomService>>);
  return { listRooms, updateRoomMetadata };
};

describe('setJamSpotlight', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(roomService).mockReset();
  });

  it('merges the spotlight into existing room metadata, keeping other keys', async () => {
    const { listRooms, updateRoomMetadata } = mockRoomService();
    listRooms.mockResolvedValue([
      { metadata: JSON.stringify({ instanceDomain: 'example.com' }) },
    ]);

    const result = await setJamSpotlight(jamEvent('host'), SPOTLIT_ID);

    expect(result).toEqual({ success: true });
    expect(listRooms).toHaveBeenCalledWith([JAM_ID]);
    expect(updateRoomMetadata).toHaveBeenCalledWith(
      JAM_ID,
      JSON.stringify({
        instanceDomain: 'example.com',
        spotlightIdentity: SPOTLIT_ID,
      }),
    );
  });

  it('writes the spotlight into empty metadata when the room has none', async () => {
    const { listRooms, updateRoomMetadata } = mockRoomService();
    listRooms.mockResolvedValue([{ metadata: '' }]);

    const result = await setJamSpotlight(jamEvent('host'), SPOTLIT_ID);

    expect(result).toEqual({ success: true });
    expect(updateRoomMetadata).toHaveBeenCalledWith(
      JAM_ID,
      JSON.stringify({ spotlightIdentity: SPOTLIT_ID }),
    );
  });

  it('clears the spotlight with an explicit null', async () => {
    const { listRooms, updateRoomMetadata } = mockRoomService();
    listRooms.mockResolvedValue([
      {
        metadata: JSON.stringify({
          instanceDomain: 'example.com',
          spotlightIdentity: SPOTLIT_ID,
        }),
      },
    ]);

    const result = await setJamSpotlight(jamEvent('host'), null);

    expect(result).toEqual({ success: true });
    expect(updateRoomMetadata).toHaveBeenCalledWith(
      JAM_ID,
      JSON.stringify({
        instanceDomain: 'example.com',
        spotlightIdentity: null,
      }),
    );
  });

  it('fails closed when existing metadata has a malformed known key', async () => {
    const { listRooms, updateRoomMetadata } = mockRoomService();
    // `instanceDomain` of the wrong type must not be re-serialized: the
    // merge would corrupt the key for other readers.
    listRooms.mockResolvedValue([
      { metadata: JSON.stringify({ instanceDomain: 42 }) },
    ]);

    const result = await setJamSpotlight(jamEvent('host'), SPOTLIT_ID);

    expect(result).toEqual({ success: false });
    expect(updateRoomMetadata).not.toHaveBeenCalled();
  });

  it('fails closed when existing metadata has a wrong-typed spotlightIdentity', async () => {
    const { listRooms, updateRoomMetadata } = mockRoomService();
    // `spotlightIdentity` of the wrong type (not string or null) fails the
    // same fail-closed guard as a malformed `instanceDomain`.
    listRooms.mockResolvedValue([
      { metadata: JSON.stringify({ spotlightIdentity: 42 }) },
    ]);

    const result = await setJamSpotlight(jamEvent('host'), SPOTLIT_ID);

    expect(result).toEqual({ success: false });
    expect(updateRoomMetadata).not.toHaveBeenCalled();
  });

  it('fails closed when the room is not open', async () => {
    const { listRooms, updateRoomMetadata } = mockRoomService();
    listRooms.mockResolvedValue([]);

    const result = await setJamSpotlight(jamEvent('host'), SPOTLIT_ID);

    expect(result).toEqual({ success: false });
    expect(updateRoomMetadata).not.toHaveBeenCalled();
  });

  it('fails closed when LiveKit is not configured', async () => {
    vi.mocked(roomService).mockResolvedValue(undefined);

    const result = await setJamSpotlight(jamEvent('host'), SPOTLIT_ID);

    expect(result).toEqual({ success: false });
  });

  it('fails closed when LiveKit rejects the update', async () => {
    const { listRooms, updateRoomMetadata } = mockRoomService();
    listRooms.mockResolvedValue([{ metadata: '' }]);
    updateRoomMetadata.mockRejectedValue(new Error('timeout'));

    const result = await setJamSpotlight(jamEvent('host'), SPOTLIT_ID);

    expect(result).toEqual({ success: false });
  });
});
