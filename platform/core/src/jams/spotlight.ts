import { jamRoomName } from '@openpeepshq/common/lib';
import type { PostWithMeta } from '@openpeepshq/common/types';
import { logger } from '../log';
import { roomService } from './livekit';

const log = logger('app:jams:spotlight');

type RoomMetadata = {
  instanceDomain?: string;
  /** Room-wide host spotlight (see `useJamSpotlight`). `null` clears it. */
  spotlightIdentity?: string | null;
  [key: string]: unknown;
};

const isRoomMetadata = (value: unknown): value is RoomMetadata => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    ('instanceDomain' in record
      ? typeof record.instanceDomain === 'string'
      : true) &&
    ('spotlightIdentity' in record
      ? typeof record.spotlightIdentity === 'string' ||
        record.spotlightIdentity === null
      : true)
  );
};

/**
 * Sets or clears the room-wide spotlight in LiveKit room metadata.
 *
 * Recording/RTMP web egress joins the room after the spotlight was set, so a
 * one-shot data packet never reaches it. Room metadata is replayed to every
 * (re)joining participant, so the egress's observer view sees the spotlight on
 * load and follows live changes via `RoomMetadataChanged`.
 */
export const setJamSpotlight = async (
  jamEvent: PostWithMeta,
  identity: string | null,
  recurrenceId?: string,
) => {
  const roomName = jamRoomName(jamEvent.id, recurrenceId);
  const rs = await roomService();
  if (rs === undefined) {
    log.warn(
      `Cannot set spotlight for jam ${jamEvent.id}: LiveKit is not configured`,
    );
    return { success: false };
  }
  try {
    const rooms = await rs.listRooms([roomName]);
    const room = rooms[0];
    if (!room) {
      log.warn(
        `Cannot set spotlight for jam ${jamEvent.id}: room ${roomName} is not open`,
      );
      return { success: false };
    }
    const parsed: unknown = room.metadata ? JSON.parse(room.metadata) : {};
    if (!isRoomMetadata(parsed)) {
      log.warn(
        `Cannot set spotlight for jam ${jamEvent.id}: room ${roomName} has malformed metadata`,
      );
      return { success: false };
    }
    await rs.updateRoomMetadata(
      roomName,
      JSON.stringify({ ...parsed, spotlightIdentity: identity }),
    );
    return { success: true };
  } catch (e) {
    log.warn(
      `Failed to set spotlight for jam ${jamEvent.id}: ${(e as Error).message}`,
    );
    return { success: false };
  }
};
