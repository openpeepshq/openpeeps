import { describe, expect, it } from 'vitest';
import { DisconnectReason } from 'livekit-client';
import { shouldReconnectAfterDisconnect } from './disconnectReason';

describe('shouldReconnectAfterDisconnect', () => {
  it('does not reconnect when the jam ended for this participant', () => {
    for (const reason of [
      DisconnectReason.ROOM_DELETED,
      DisconnectReason.ROOM_CLOSED,
      DisconnectReason.PARTICIPANT_REMOVED,
      DisconnectReason.CLIENT_INITIATED,
      DisconnectReason.DUPLICATE_IDENTITY,
      DisconnectReason.USER_REJECTED,
    ]) {
      expect(shouldReconnectAfterDisconnect(reason)).toBe(false);
    }
  });

  it('reconnects after a transient drop', () => {
    for (const reason of [
      DisconnectReason.SIGNAL_CLOSE,
      DisconnectReason.STATE_MISMATCH,
      DisconnectReason.SERVER_SHUTDOWN,
      DisconnectReason.UNKNOWN_REASON,
    ]) {
      expect(shouldReconnectAfterDisconnect(reason)).toBe(true);
    }
  });

  it('reconnects when no reason is reported', () => {
    expect(shouldReconnectAfterDisconnect(undefined)).toBe(true);
  });
});
