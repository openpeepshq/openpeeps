import type { JamEvent } from '@openpeeps/common/types';
import { jamEventSchema } from '@openpeeps/common/types';
import type { Room } from 'livekit-client';
import { uuidv7 } from 'uuidv7';

const encoder = new TextEncoder();

type JamMetadata = {
  profile?: { id?: string };
};

type PersistJamEvent = (event: JamEvent, pathParams: { id: string }) => Promise<JamEvent>;

export async function sendJamEvent(
  room: Room,
  persistEvent: PersistJamEvent,
  type: JamEvent['type'],
  content: JamEvent['content'],
): Promise<JamEvent> {
  const metadata = JSON.parse(room.localParticipant.metadata || '{}') as JamMetadata;
  const newEvent: JamEvent = {
    id: uuidv7(),
    type,
    jamId: room.name,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profileId: metadata?.profile?.id ?? '',
  };
  const encodedMessages = encoder.encode(JSON.stringify(newEvent));
  await persistEvent(newEvent, { id: room.name || '' });
  await room.localParticipant.publishData(encodedMessages, { reliable: false });
  return newEvent;
}

export async function sendReaction(
  room: Room,
  emoji: string,
  persistEvent: PersistJamEvent,
): Promise<JamEvent> {
  const metadata = JSON.parse(room.localParticipant.metadata || '{}') as JamMetadata;
  const newEvent: JamEvent = {
    id: uuidv7(),
    type: 'reaction',
    jamId: room.name,
    content: emoji,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profileId: metadata.profile?.id ?? '',
  };

  const encodedMessages = encoder.encode(JSON.stringify(newEvent));
  await room.localParticipant.publishData(encodedMessages, {
    reliable: false,
    topic: 'reactions',
  });

  void persistEvent(newEvent, { id: eventJamId(newEvent) });
  return newEvent;
}

function eventJamId(event: JamEvent): string {
  return event.jamId || '';
}

export function parseJamEventPayload(payload: Uint8Array): JamEvent | undefined {
  try {
    const receivedPacket = new TextDecoder().decode(payload);
    return jamEventSchema.parse(JSON.parse(receivedPacket)) as JamEvent;
  } catch {
    return undefined;
  }
}
