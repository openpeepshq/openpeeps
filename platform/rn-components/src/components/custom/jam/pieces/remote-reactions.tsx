import React, { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/react-native';
import { JamEvent, jamEventSchema } from '@openpeepshq/common';
import { RoomEvent } from 'livekit-client';
import { AnimatedEmoji } from './animated-emoji';
import { Buffer } from 'react-native-buffer';

const REACTION_DURATION_MS = 5000;

interface RemoteReactionsProps {
  participantId: string;
}

export const RemoteReactions: React.FC<RemoteReactionsProps> = ({
  participantId,
}) => {
  const room = useRoomContext();
  const [participantReactions, setParticipantReactions] = useState<JamEvent[]>(
    []
  );

  useEffect(() => {
    const timeoutIds = new Map<string, ReturnType<typeof setTimeout>>();

    const onDataReceived = (payload: Uint8Array) => {
      try {
        const receivedPacketString = Buffer.from(payload).toString('utf8');
        const jamEvent = jamEventSchema.parse(
          JSON.parse(receivedPacketString)
        ) as JamEvent;
        if (
          jamEvent.type !== 'reaction' ||
          jamEvent.profileId !== participantId
        ) {
          return;
        }

        setParticipantReactions((prev) => {
          if (prev.some((reaction) => reaction.id === jamEvent.id)) {
            return prev;
          }
          return [...prev, jamEvent];
        });

        const existing = timeoutIds.get(jamEvent.id);
        if (existing) clearTimeout(existing);

        const timeoutId = setTimeout(() => {
          setParticipantReactions((prev) =>
            prev.filter((reaction) => reaction.id !== jamEvent.id)
          );
          timeoutIds.delete(jamEvent.id);
        }, REACTION_DURATION_MS);
        timeoutIds.set(jamEvent.id, timeoutId);
      } catch (err) {
        console.log('Error parsing payload', err);
      }
    };

    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
      for (const timeoutId of timeoutIds.values()) {
        clearTimeout(timeoutId);
      }
      setParticipantReactions([]);
    };
  }, [participantId, room]);

  return (
    <>
      {participantReactions.map((reaction) => (
        <AnimatedEmoji key={reaction.id} emoji={reaction.content ?? ''} />
      ))}
    </>
  );
};
