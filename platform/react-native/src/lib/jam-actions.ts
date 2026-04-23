import { Room, Track } from 'livekit-client';
import { MetadataType } from '../types';

export const toggleMicrophone = async (room: Room) => {
  try {
    const currentAudioTrack = [
      ...room.localParticipant.audioTrackPublications.values(),
    ].filter(atp => atp.audioTrack?.source === Track.Source.Microphone)[0]
      ?.track;

    if (currentAudioTrack) {
      await room.localParticipant.unpublishTrack(currentAudioTrack);
    } else {
      await room.localParticipant.setMicrophoneEnabled(true);
    }
  } catch (error) {
    console.log('Error toggling microphone:', error);
  }
};

export const toggleCamera = async (
  room: Room,
) => {
  try {
    await room.localParticipant.setCameraEnabled(
      !room.localParticipant.isCameraEnabled,
    );

  } catch (error) {
    console.log('Error toggling camera', error);
  }
};

export const toggleHand = (room: Room) => {
  const oldMetadata = JSON.parse(room.localParticipant.metadata || '{}');
  const newMetadata: MetadataType = {
    ...oldMetadata,
    handRaised: oldMetadata?.handRaised !== undefined ? undefined : new Date(),
  };

  return room.localParticipant.setMetadata(JSON.stringify(newMetadata));
};
