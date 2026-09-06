import { DisconnectReason } from 'livekit-client';

/**
 * Disconnects that end the jam for this participant. Re-tokening after one of
 * these would drop a moderator straight back into a jam everyone has left,
 * which reopens the room and re-notifies the community.
 */
const TERMINAL_REASONS = new Set<DisconnectReason>([
  DisconnectReason.CLIENT_INITIATED,
  DisconnectReason.DUPLICATE_IDENTITY,
  DisconnectReason.PARTICIPANT_REMOVED,
  DisconnectReason.ROOM_DELETED,
  DisconnectReason.ROOM_CLOSED,
  DisconnectReason.USER_REJECTED,
]);

/**
 * Whether a dropped connection should be retried. Unknown and missing reasons
 * count as transient so mobile idle and socket drops still recover.
 */
export const shouldReconnectAfterDisconnect = (reason?: DisconnectReason) =>
  reason === undefined || !TERMINAL_REASONS.has(reason);
