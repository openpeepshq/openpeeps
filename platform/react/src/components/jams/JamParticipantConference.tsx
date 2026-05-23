import { useEffect, useRef, useState } from 'react';
import {
  CarouselLayout,
  ConnectionStateToast,
  ControlBar,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  RoomAudioRenderer,
  isTrackReference,
  useCreateLayoutContext,
  usePinnedTracks,
  useTracks,
} from '@livekit/components-react';
import { Laugh, MessageSquare } from 'lucide-react';
import { RoomEvent, Track } from 'livekit-client';
import { useT } from '../../i18n';
import { useJamObserver } from './JamContext';
import { JamChatDrawer } from './JamChatDrawer';
import { JamEventsProvider, useJamEventsContext } from './JamEventsContext';
import { JamParticipantTile } from './JamParticipantTile';
import { JamReactionMenu } from './JamReactionMenu';

function JamConferenceControls({
  chatOpen,
  onToggleChat,
}: {
  chatOpen: boolean;
  onToggleChat: () => void;
}) {
  const t = useT();
  const observer = useJamObserver();
  const { sendReactionEmoji } = useJamEventsContext();
  const [reactionMenuOpen, setReactionMenuOpen] = useState(false);

  const handleEmojiSelect = async (emoji: string) => {
    await sendReactionEmoji(emoji);
    setReactionMenuOpen(false);
  };

  return (
    <div className="relative flex w-full flex-col">
      {!observer && reactionMenuOpen && (
        <div className="absolute bottom-full left-4 z-50 mb-2">
          <JamReactionMenu onSelect={handleEmojiSelect} />
        </div>
      )}
      <div className="flex w-full items-center justify-center gap-2 px-2">
        {!observer && (
          <button
            type="button"
            title={t('jams.reactions.sendTitle', { defaultValue: 'Send reaction' })}
            className={`lk-button shrink-0 ${reactionMenuOpen ? 'lk-button-active' : ''}`}
            onClick={() => setReactionMenuOpen((open) => !open)}
          >
            <Laugh className="size-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <ControlBar controls={{ chat: false }} />
        </div>
        <button
          type="button"
          title={t('jams.drawer.chatTitle', { defaultValue: 'Chat' })}
          className={`lk-button shrink-0 ${chatOpen ? 'lk-button-active' : ''}`}
          onClick={onToggleChat}
        >
          <MessageSquare className="size-5" />
        </button>
      </div>
    </div>
  );
}

function JamParticipantConferenceInner() {
  const observer = useJamObserver();
  const [chatOpen, setChatOpen] = useState(false);
  const layoutContext = useCreateLayoutContext();
  const pinnedTracks = usePinnedTracks(layoutContext);
  const screenShareTrackRef = useRef<(typeof pinnedTracks)[number] | null>(
    null,
  );

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);
  const focusTrack = pinnedTracks[0];
  const carouselTracks = tracks.filter(
    (track) => !focusTrack || track.participant.identity !== focusTrack.participant.identity,
  );

  useEffect(() => {
    const subscribedScreenShare = screenShareTracks.find(
      (track) => track.publication.isSubscribed,
    );

    if (subscribedScreenShare && screenShareTrackRef.current === null) {
      layoutContext.pin.dispatch?.({
        msg: 'set_pin',
        trackReference: subscribedScreenShare,
      });
      screenShareTrackRef.current = subscribedScreenShare;
      return;
    }

    if (
      screenShareTrackRef.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          screenShareTrackRef.current?.publication?.trackSid,
      )
    ) {
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      screenShareTrackRef.current = null;
    }
  }, [layoutContext.pin, screenShareTracks]);

  return (
    <LayoutContextProvider value={layoutContext}>
      <div className="relative flex h-full w-full flex-1 overflow-hidden">
        <div className="lk-video-conference flex min-w-0 flex-1 flex-col">
          <div className="lk-video-conference-inner flex min-h-0 flex-1 flex-col">
            {focusTrack && isTrackReference(focusTrack) ? (
              <div className="lk-focus-layout-wrapper min-h-0 flex-1">
                <FocusLayoutContainer>
                  <CarouselLayout tracks={carouselTracks}>
                    <JamParticipantTile />
                  </CarouselLayout>
                  <FocusLayout trackRef={focusTrack} />
                </FocusLayoutContainer>
              </div>
            ) : (
              <div className="lk-grid-layout-wrapper min-h-0 flex-1">
                <GridLayout tracks={tracks}>
                  <JamParticipantTile />
                </GridLayout>
              </div>
            )}
            <JamConferenceControls
              chatOpen={chatOpen}
              onToggleChat={() => setChatOpen((open) => !open)}
            />
          </div>
        </div>
        <JamChatDrawer
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          readOnly={observer}
        />
      </div>
      <ConnectionStateToast />
    </LayoutContextProvider>
  );
}

export function JamParticipantConference() {
  return (
    <JamEventsProvider>
      <JamParticipantConferenceInner />
      <RoomAudioRenderer />
    </JamEventsProvider>
  );
}
