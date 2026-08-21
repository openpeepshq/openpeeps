import { useEffect, useState } from 'react';
import {
  useParticipants,
  useRoomContext,
  useTrackToggle,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  CircleEllipsis,
  CircleStop,
  Disc,
  Dot,
  Hand,
  Info,
  Laugh,
  MessageSquareText,
  ScreenShare,
  ScreenShareOff,
  UsersRound,
} from 'lucide-react';
import { Blur, SquareStop } from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { subscribePushNotifications } from '../../push';
import { useT } from '../../i18n';
import { useServerInfo } from '../server-data';
import { useCurrentProfile } from '../layout/IdentityContext';
import { useToast } from '../layout/ToastProvider';
import { useJamContext } from './JamContext';
import { useJamEventsContext } from './JamEventsContext';
import { useJamRecordingState } from './jamRecordingState';
import {
  JamAudioOutputSelector,
  JamCameraSelector,
  JamMicSelector,
} from './JamDeviceSelectors';
import { JamReactionMenu } from './JamReactionMenu';
import { JamToolbarButton } from './JamToolbarButton';
import { LeaveCloseButton } from './LeaveCloseButton';
import { toggleHand } from './jamEventActions';
import { useRaisedHands } from './useJamHands';

export interface JamFooterProps {
  chatOpen: boolean;
  onToggleChat: () => void;
  peopleOpen: boolean;
  onTogglePeople: () => void;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  speakerDeviceId?: string;
  speakerEnabled: boolean;
  onSpeakerChange: (deviceId: string) => void;
  onToggleSpeaker: () => void;
  blur: boolean;
  onToggleBlur: () => void;
}

/** Shared business logic + data for both footer variants. */
const useFooterControls = () => {
  const t = useT();
  const room = useRoomContext();
  const me = useCurrentProfile();
  const serverInfo = useServerInfo();
  const { jam, jamPost, occurrence } = useJamContext();
  const { openpeepsApi, client } = useOpenpeeps();
  const { sendReactionEmoji } = useJamEventsContext();
  const participants = useParticipants();
  const raisedHands = useRaisedHands(room);

  // Entering the jam room is a strong signal the user wants live updates, so
  // opportunistically register push notifications, mirroring the Svelte
  // `DesktopFooter` onMount subscription.
  const vapidKey = serverInfo.vapid.publicKey;
  useEffect(() => {
    void subscribePushNotifications({ client, applicationServerKey: vapidKey });
  }, [client, vapidKey]);

  const { success: toastSuccess, error: toastError } = useToast();
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
    setBusy(true);
    try {
      if (isRecording) {
        const recording = await stopRecording(
          undefined,
          occurrence ? { occurrence } : undefined,
        );
        toastSuccess(t('jams.recording.stopped', { id: recording.id }));
      } else {
        const recording = await startRecording(
          undefined,
          occurrence ? { occurrence } : undefined,
        );
        toastSuccess(t('jams.recording.started', { id: recording.id }));
      }
    } catch {
      toastError(
        isRecording
          ? t('jams.recording.stopError')
          : t('jams.recording.startError'),
      );
    } finally {
      setBusy(false);
    }
  };

  return {
    t,
    room,
    isModerator,
    isRecording,
    recordingEnabled,
    handRaised,
    busy,
    participantCount: participants.length,
    waitingRoomCount,
    sendReactionEmoji,
    toggleRecording,
    raiseHand: () => void toggleHand(room),
  };
};

/** Record control mirroring `RecordSwitch.svelte` (always red, Disc / SquareStop). */
const RecordButton = ({
  isRecording,
  busy,
  onToggle,
  t,
}: {
  isRecording: boolean;
  busy: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useT>;
}) => (
  <JamToolbarButton
    tone="danger"
    disabled={busy}
    title={
      isRecording
        ? t('jams.recording.stopTitle')
        : t('events.recordingInProgress')
    }
    action={onToggle}
  >
    {isRecording ? <SquareStop /> : <Disc />}
  </JamToolbarButton>
);

/** People button with count badges mirroring Svelte `UserButton.svelte`. */
const UserButton = ({
  active,
  count,
  waitingRoomCount,
  onToggle,
  t,
}: {
  active: boolean;
  count: number;
  waitingRoomCount: number;
  onToggle: () => void;
  t: ReturnType<typeof useT>;
}) => (
  <JamToolbarButton
    title={t('jams.participant.showEveryone')}
    tone={active ? 'active' : 'default'}
    action={onToggle}
  >
    <span className="bg-border-2 text-foreground absolute -right-2 -top-2 size-6 rounded-full p-1 px-2 text-xs">
      {count}
    </span>
    {waitingRoomCount > 0 ? (
      <span className="bg-border-2 text-foreground absolute -bottom-2 -right-2 size-6 rounded-full p-1 px-2 text-xs">
        {waitingRoomCount}
      </span>
    ) : null}
    <UsersRound />
  </JamToolbarButton>
);

/** Chat toggle with unread dot mirroring `ChatDrawerButton.svelte`. */
const ChatButton = ({
  active,
  onToggle,
  t,
}: {
  active: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useT>;
}) => {
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

  return (
    <JamToolbarButton
      title={t('jams.chat.openEveryoneTitle')}
      tone={active ? 'active' : 'default'}
      action={() => {
        onToggle();
        setHasNewMessages(false);
      }}
    >
      <MessageSquareText />
      {hasNewMessages && !active ? (
        <Dot
          size={13}
          className="bg-error text-destructive absolute right-0 top-0 rounded-full"
        />
      ) : null}
    </JamToolbarButton>
  );
};

/** Screen share control mirroring `ScreenShareSwitch.svelte`. */
const ScreenShareButton = ({
  closeMenu,
  t,
  mobile = false,
}: {
  closeMenu?: () => void;
  t: ReturnType<typeof useT>;
  mobile?: boolean;
}) => {
  const { enabled, toggle } = useTrackToggle({
    source: Track.Source.ScreenShare,
    captureOptions: { audio: true },
  });

  const action = () => {
    closeMenu?.();
    void toggle();
  };

  if (mobile) {
    return (
      <button
        type="button"
        className="flex flex-col items-center justify-center gap-y-2 p-2 md:hidden"
        onClick={action}
      >
        {enabled ? <ScreenShareOff /> : <ScreenShare />}
        <span>
          {enabled
            ? t('jams.screenShare.stopScreenshareMobile')
            : t('jams.screenShare.startScreenshareMobile')}
        </span>
      </button>
    );
  }

  return (
    <JamToolbarButton
      title={t('jams.screenShare.startStopTitle')}
      tone={enabled ? 'active' : 'default'}
      className="hidden md:flex"
      action={action}
    >
      {enabled ? <ScreenShareOff /> : <ScreenShare />}
    </JamToolbarButton>
  );
};

/** Mobile overflow menu mirroring `MobileMenu.svelte`. */
const MobileMenu = ({
  isModerator,
  recordingEnabled,
  isRecording,
  busy,
  onClose,
  onOpenChat,
  onOpenPeople,
  onOpenDetails,
  onRaiseHand,
  onToggleRecording,
  t,
}: {
  isModerator: boolean;
  recordingEnabled: boolean;
  isRecording: boolean;
  busy: boolean;
  onClose: () => void;
  onOpenChat: () => void;
  onOpenPeople: () => void;
  onOpenDetails: () => void;
  onRaiseHand: () => void;
  onToggleRecording: () => void;
  t: ReturnType<typeof useT>;
}) => (
  <div className="bg-surface text-foreground absolute bottom-20 left-2 right-2 z-50 grid grid-cols-3 rounded-md p-2">
    <button
      type="button"
      className="flex flex-col items-center justify-center gap-y-2 p-2 md:hidden"
      onClick={() => {
        onClose();
        onOpenChat();
      }}
    >
      <MessageSquareText />
      <span>{t('jams.mobileMenu.inJamMessage')}</span>
    </button>
    <button
      type="button"
      className="flex flex-col items-center justify-center gap-y-2 p-2 md:hidden"
      onClick={() => {
        onClose();
        onOpenDetails();
      }}
    >
      <Info />
      <span>{t('jams.mobileMenu.jamDetails')}</span>
    </button>
    <ScreenShareButton closeMenu={onClose} t={t} mobile />
    <button
      type="button"
      className="flex flex-col items-center justify-center gap-y-2 p-2 md:hidden"
      onClick={() => {
        onClose();
        onRaiseHand();
      }}
    >
      <Hand />
      <span>{t('jams.hand.raiseLabel')}</span>
    </button>
    <button
      type="button"
      className="flex flex-col items-center justify-center gap-y-2 p-2 md:hidden"
      onClick={() => {
        onClose();
        onOpenPeople();
      }}
    >
      <UsersRound />
      <span>{t('jams.mobileMenu.people')}</span>
    </button>
    {isModerator && recordingEnabled ? (
      <button
        type="button"
        disabled={busy}
        className="flex flex-col items-center justify-center gap-y-2 p-2 md:hidden"
        onClick={() => {
          onClose();
          onToggleRecording();
        }}
      >
        {isRecording ? <CircleStop /> : <Disc />}
        <span>
          {isRecording
            ? t('jams.recording.stopTitle')
            : t('events.recordingInProgress')}
        </span>
      </button>
    ) : null}
  </div>
);

/**
 * In-room footer mirroring the Svelte `DesktopFooter` / `MobileFooter` split.
 */
export const JamFooter = ({
  chatOpen,
  onToggleChat,
  peopleOpen,
  onTogglePeople,
  detailsOpen,
  onToggleDetails,
  speakerDeviceId,
  speakerEnabled,
  onSpeakerChange,
  onToggleSpeaker,
  blur,
  onToggleBlur,
}: JamFooterProps) => {
  const {
    t,
    isModerator,
    isRecording,
    recordingEnabled,
    handRaised,
    busy,
    participantCount,
    waitingRoomCount,
    sendReactionEmoji,
    toggleRecording,
    raiseHand,
  } = useFooterControls();
  const { jamEvent } = useJamContext();

  const [reactionMenuOpen, setReactionMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleEmojiSelect = async (emoji: string) => {
    await sendReactionEmoji(emoji);
  };

  return (
    <>
      {/* Desktop toolbar */}
      <div className="hidden w-full flex-none items-center justify-between px-4 py-3 md:flex">
        <h1 className="truncate pr-2">{jamEvent.name}</h1>

        <div className="relative flex items-center gap-x-4">
          {reactionMenuOpen ? (
            <div className="absolute bottom-12 right-0 z-50 md:w-max">
              <JamReactionMenu onSelect={handleEmojiSelect} />
            </div>
          ) : null}

          <JamMicSelector />
          <JamCameraSelector />
          <JamAudioOutputSelector
            speakerDeviceId={speakerDeviceId}
            speakerEnabled={speakerEnabled}
            onSpeakerChange={onSpeakerChange}
            onToggleSpeaker={onToggleSpeaker}
          />

          {isModerator && recordingEnabled ? (
            <RecordButton
              isRecording={isRecording}
              busy={busy}
              onToggle={() => void toggleRecording()}
              t={t}
            />
          ) : null}

          <JamToolbarButton
            title={
              blur ? t('jams.blur.turnOff') : t('jams.blur.blurBackground')
            }
            tone={blur ? 'active' : 'default'}
            action={onToggleBlur}
          >
            <Blur />
          </JamToolbarButton>

          <JamToolbarButton
            title={t('jams.hand.raiseTitle')}
            tone={handRaised ? 'active' : 'default'}
            action={raiseHand}
          >
            <Hand />
          </JamToolbarButton>

          <ScreenShareButton t={t} />

          <JamToolbarButton
            title={t('jams.reactions.sendTitle')}
            tone={reactionMenuOpen ? 'active' : 'default'}
            action={() => setReactionMenuOpen((open) => !open)}
          >
            <Laugh />
          </JamToolbarButton>

          <ChatButton active={chatOpen} onToggle={onToggleChat} t={t} />
        </div>

        <div className="relative flex items-center gap-x-4">
          <JamToolbarButton
            title={t('jams.mobileMenu.jamDetails')}
            tone={detailsOpen ? 'active' : 'default'}
            action={onToggleDetails}
          >
            <Info />
          </JamToolbarButton>
          <UserButton
            active={peopleOpen}
            count={participantCount}
            waitingRoomCount={waitingRoomCount}
            onToggle={onTogglePeople}
            t={t}
          />
          <LeaveCloseButton />
        </div>
      </div>

      {/* Mobile toolbar */}
      <div className="bg-background/75 relative flex w-full items-center justify-between gap-x-2 px-2 py-3 md:hidden">
        {reactionMenuOpen ? (
          <div className="absolute bottom-20 right-[7%] z-50 mt-2 w-[90%] rounded-md p-2">
            <JamReactionMenu onSelect={handleEmojiSelect} mobile />
          </div>
        ) : null}
        {mobileMenuOpen ? (
          <MobileMenu
            isModerator={isModerator}
            recordingEnabled={recordingEnabled}
            isRecording={isRecording}
            busy={busy}
            onClose={() => setMobileMenuOpen(false)}
            onOpenChat={onToggleChat}
            onOpenPeople={onTogglePeople}
            onOpenDetails={onToggleDetails}
            onRaiseHand={raiseHand}
            onToggleRecording={() => void toggleRecording()}
            t={t}
          />
        ) : null}

        <JamMicSelector />
        <JamCameraSelector />
        <JamAudioOutputSelector
          speakerDeviceId={speakerDeviceId}
          speakerEnabled={speakerEnabled}
          onSpeakerChange={onSpeakerChange}
          onToggleSpeaker={onToggleSpeaker}
        />

        <JamToolbarButton
          title={t('jams.reactions.sendTitle')}
          tone={reactionMenuOpen ? 'active' : 'default'}
          action={() => setReactionMenuOpen((open) => !open)}
        >
          <Laugh />
        </JamToolbarButton>

        <JamToolbarButton
          title={t('jams.drawer.jamControls')}
          action={() => setMobileMenuOpen((open) => !open)}
        >
          <CircleEllipsis />
        </JamToolbarButton>

        <LeaveCloseButton />
      </div>
    </>
  );
};
