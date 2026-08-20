import React, { useState } from 'react';
import { useRoomContext } from '@livekit/react-native';
import { JamEvent, jamEventSchema } from '@openpeepshq/common';
import { RoomEvent } from 'livekit-client';
import { AnimatedEmoji } from './animated-emoji';
import { Buffer } from 'react-native-buffer';


interface RemoteReactionsProps {
  participantId: string;
}

export const RemoteReactions: React.FC<RemoteReactionsProps> = ({
  participantId,
}) => {
  const room = useRoomContext();
  const [participantReactions, setParticipantReactions] = useState<JamEvent[]>(
    [],
  );

  room.on(RoomEvent.DataReceived, payload => {
    try {
      const receivedPacketString = Buffer.from(payload).toString('utf8');
      const jamEvent: JamEvent = jamEventSchema.parse(
        JSON.parse(receivedPacketString),
      ) as JamEvent;
      if (
        jamEvent.type === 'reaction' &&
        jamEvent.profileId === participantId
      ) {
        setParticipantReactions(prev => [...prev, jamEvent]);
        setTimeout(() => {
          const newReactions = participantReactions.filter(
            r => r.id !== jamEvent.id,
          );
          setParticipantReactions(newReactions);
        }, 5000);
      }
    } catch (err) {
      console.log('Error parsing payload', err);
      return;
    }
  });

  return (
    <>
      {participantReactions.map((reaction, idx) => (
        <AnimatedEmoji key={idx} emoji={reaction.content ?? ''} />
      ))}
    </>
  );
};
