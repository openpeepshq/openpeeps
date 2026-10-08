import { useEffect, useState } from 'react';
import type { Room } from 'livekit-client';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useServerInfo } from '../../components/server-data/context';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useJamContext } from '../../components/jams/JamContext';
import { useJamEventsContext } from '../../components/jams/JamEventsContext';
import { useJamRecordingState } from '../../components/jams/jamRecordingState';
import { toggleHand } from '../../components/jams/jamEventActions';
import { useRaisedHands } from '../../components/jams/useJamHands';

export type UseJamFooterControlsArgs = {
  room: Room;
  participantCount: number;
  /** Asked before stopping a recording; resolve `false` to abort. */
  confirmStopRecording: () => boolean | Promise<boolean>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

/** Toolbar business logic shared by the web and native jam footers. */
export const useJamFooterControls = ({
  room,
  participantCount,
  confirmStopRecording,
  onSuccess,
  onError,
}: UseJamFooterControlsArgs) => {
  const t = useT();
  const me = useCurrentProfile();
  const serverInfo = useServerInfo();
  const { jam, jamPost, occurrence } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const { sendReactionEmoji } = useJamEventsContext();
  const raisedHands = useRaisedHands(room);

  const isModerator = !!me && jam.moderators.includes(me.id);
  const { isRecording } = useJamRecordingState();
  const handRaised = raisedHands.has(room.localParticipant.identity);
  const recordingEnabled = serverInfo.jams.livekit.recordingEnabled;

  const startRecording = openpeepsApi.startRecordingAction({ id: jamPost.id });
  const stopRecording = openpeepsApi.stopRecordingAction({ id: jamPost.id });
  const waitingRoom = openpeepsApi.useWaitingRoomStream(
    isModerator && jam.waitingRoom ? jamPost.id : '',
    occurrence,
  );

  const [busy, setBusy] = useState(false);

  const waitingRoomCount =
    isModerator && jam.waitingRoom && waitingRoom
      ? Object.keys(waitingRoom).length
      : 0;

  const toggleRecording = async () => {
    if (isRecording && !(await confirmStopRecording())) {
      return;
    }
    setBusy(true);
    try {
      if (isRecording) {
        const recording = await stopRecording(
          undefined,
          occurrence ? { occurrence } : undefined,
        );
        onSuccess(t('jams.recording.stopped', { id: recording.id }));
      } else {
        const recording = await startRecording(
          undefined,
          occurrence ? { occurrence } : undefined,
        );
        onSuccess(t('jams.recording.started', { id: recording.id }));
      }
    } catch {
      onError(
        isRecording
          ? t('jams.recording.stopError')
          : t('jams.recording.startError'),
      );
    } finally {
      setBusy(false);
    }
  };

  return {
    isModerator,
    isRecording,
    recordingEnabled,
    handRaised,
    busy,
    participantCount,
    waitingRoomCount,
    sendReactionEmoji,
    toggleRecording,
    raiseHand: () => void toggleHand(room),
  };
};

/** Unread-dot state for the chat toggle while the drawer is closed. */
export const useJamChatUnread = (active: boolean) => {
  const { sessionEvents } = useJamEventsContext();
  const [lastSeenMessageId, setLastSeenMessageId] = useState('');
  const [hasNewMessages, setHasNewMessages] = useState(false);

  useEffect(() => {
    const lastMessage = [...sessionEvents]
      .reverse()
      .find((event) => event.type === 'message');
    if (!lastMessage || lastMessage.type !== 'message') return;

    if (active) {
      setLastSeenMessageId(lastMessage.id);
      setHasNewMessages(false);
      return;
    }

    if (lastSeenMessageId && lastMessage.id > lastSeenMessageId) {
      setHasNewMessages(true);
    } else if (!lastSeenMessageId) {
      setLastSeenMessageId(lastMessage.id);
    }
  }, [sessionEvents, active, lastSeenMessageId]);

  return { hasNewMessages, clear: () => setHasNewMessages(false) };
};
