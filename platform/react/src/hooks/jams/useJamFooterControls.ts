import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room } from 'livekit-client';
import type { JamWaitingRoomEntry } from '@openpeepshq/common/types';
import type { SseError } from '@openpeepshq/fetch-client';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useServerInfo } from '../../components/server-data/context';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useJamContext } from '../../components/jams/JamContext';
import { useJamEventsContext } from '../../components/jams/JamEventsContext';
import { useJamRecordingState } from '../../components/jams/jamRecordingState';
import { toggleHand } from '../../components/jams/jamEventActions';
import { useRaisedHands } from '../../components/jams/useJamHands';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import { logger } from '../../log';

const log = logger('jams:recording');

/**
 * Return entries present in `next` but not in `prev` (keyed by profile id).
 * The waiting-room stream sends display-only entries
 * (`jamWaitingRoomEntrySchema`), not full profiles — only the keys are read.
 */
export const diffWaitingRoomAdditions = (
  prev: Record<string, JamWaitingRoomEntry> | null,
  next: Record<string, JamWaitingRoomEntry> | undefined,
): JamWaitingRoomEntry[] => {
  if (!prev || !next) return [];
  return Object.entries(next)
    .filter(([id]) => !(id in prev))
    .map(([, profile]) => profile);
};

export type UseJamFooterControlsArgs = {
  room: Room;
  participantCount: number;
  /** Asked before stopping a recording; resolve `false` to abort. */
  confirmStopRecording: () => boolean | Promise<boolean>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  /**
   * Show a toast when someone joins the waiting room. One-way: each platform
   * maps the event to its own neutral (info) toast, so no variant is threaded
   * through the shared hook.
   */
  showToast: (message: string) => void;
};

/** Toolbar business logic shared by the web and native jam footers. */
export const useJamFooterControls = ({
  room,
  participantCount,
  confirmStopRecording,
  onSuccess,
  onError,
  showToast,
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

  // The waiting-room stream's non-2xx failure (auth expiry, 4xx/5xx) surfaces
  // as a one-shot toast through the same error channel as the recording
  // failures — the footer has no drawer to render a persistent banner in. The
  // failure is also logged (same class of event as `useSessionEvents`'s) so a
  // stream that dies on a non-moderator surface stays diagnosable. `t`/`onError`
  // are read through refs so the callback is referentially stable (a new
  // identity would tear the stream down on every render).
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  });
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });
  const onWaitingRoomStreamError = useCallback((error?: SseError) => {
    const tNow = tRef.current;
    log.warn('waiting-room stream failed to open:', error);
    const fallback = tNow('jams.waitingRoom.streamError', {
      defaultValue: 'Unable to reach the waiting room',
    });
    const message = apiErrorMessage(error, tNow, fallback);
    if (message.length > 0) onErrorRef.current(message);
  }, []);

  const waitingRoom = openpeepsApi.useWaitingRoomStream(
    isModerator && jam.waitingRoom ? jamPost.id : '',
    occurrence,
    onWaitingRoomStreamError,
  );

  /**
   * The waiting room's previous snapshot. Diffing against the previous state
   * (rather than an accumulating ever-seen set) means a profile that left and
   * re-joined toasts again. `null` means "no snapshot for this room yet".
   */
  const waitingRoomBaseline = useRef<Record<
    string,
    JamWaitingRoomEntry
  > | null>(null);

  /** Count the toast diff is based on, so the badge never disagrees with it. */
  const [waitingRoomCountState, setWaitingRoomCountState] = useState(0);

  // Reset the baseline when the room identity changes (occurrence switch or
  // gate toggle): without this, the first snapshot of the next room diffs
  // against the previous room's last snapshot and announces everyone already
  // waiting there in one burst toast. The reset effect runs before the
  // snapshot effect sees the new room's first value.
  useEffect(() => {
    if (!isModerator || !jam.waitingRoom) {
      waitingRoomBaseline.current = null;
      setWaitingRoomCountState(0);
      return;
    }
    waitingRoomBaseline.current = null;
  }, [jamPost.id, occurrence, isModerator, jam.waitingRoom]);

  useEffect(() => {
    if (!waitingRoom) return;

    const previous = waitingRoomBaseline.current;
    waitingRoomBaseline.current = { ...waitingRoom };
    setWaitingRoomCountState(Object.keys(waitingRoom).length);

    if (previous === null) return;

    const additions = diffWaitingRoomAdditions(previous, waitingRoom);

    if (additions.length > 0) {
      showToast(
        t(
          additions.length === 1
            ? 'jams.waitingRoom.joinedToastOne'
            : 'jams.waitingRoom.joinedToastMany',
          { count: additions.length },
        ),
      );
    }
  }, [waitingRoom, t, showToast]);

  const [busy, setBusy] = useState(false);

  const waitingRoomCount = waitingRoomCountState;

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
        log.info('recording stopped', recording.id);
        onSuccess(t('jams.recording.stopped'));
      } else {
        const recording = await startRecording(
          undefined,
          occurrence ? { occurrence } : undefined,
        );
        log.info('recording started', recording.id);
        onSuccess(t('jams.recording.started'));
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

  const recordingLabel = busy
    ? t(isRecording ? 'jams.recording.stopping' : 'jams.recording.starting')
    : t(
        isRecording ? 'jams.recording.stopTitle' : 'jams.recording.recordTitle',
      );

  return {
    isModerator,
    isRecording,
    recordingLabel,
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
