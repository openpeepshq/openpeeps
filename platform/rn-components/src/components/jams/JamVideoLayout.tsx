import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  isTrackReference,
  type TrackReferenceOrPlaceholder,
  useParticipants,
  useRoomContext,
  VideoTrack,
} from '@livekit/react-native';
import { useTranslation } from 'react-i18next';
import { sortByRaisedHand } from '@openpeepshq/common/lib';
import { parseParticipantMetadata, useJamStage } from '@openpeepshq/react';
import {
  LayoutGridIcon,
  PinIcon,
  PinOffIcon,
  ScreenShareIcon,
} from '../icons/index';
import { ThemedText } from '../ui/themed-text';
import { AvatarWithName } from '../profile/AvatarWithName';
import { JamCallParticipant } from './JamCallParticipant';

export interface JamVideoLayoutProps {
  /** One camera track reference (or placeholder) per participant. */
  cameraTracks: TrackReferenceOrPlaceholder[];
  /** Active screen-share track references. */
  screenShareTracks: TrackReferenceOrPlaceholder[];
  observer: boolean;
}

type StageControls = {
  spotlightIdentity: string | null;
  onEnlarge?: (identity: string) => void;
  onToggleSpotlight?: (identity: string | null) => void;
};

const cameraPublishing = (track: TrackReferenceOrPlaceholder) =>
  isTrackReference(track) && !track.publication.isMuted;

/** Enlarge / spotlight wiring shared by every tile in a layout. */
const tileProps = (
  track: TrackReferenceOrPlaceholder,
  { spotlightIdentity, onEnlarge, onToggleSpotlight }: StageControls
) => {
  const identity = track.participant.identity;
  const spotlighted = identity === spotlightIdentity;
  return {
    spotlighted,
    onEnlarge:
      onEnlarge && cameraPublishing(track)
        ? () => onEnlarge(identity)
        : undefined,
    onToggleSpotlight: onToggleSpotlight
      ? () => onToggleSpotlight(spotlighted ? null : identity)
      : undefined,
  };
};

const StageButton = ({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    className="size-10 items-center justify-center rounded-full border border-border bg-card"
  >
    {children}
  </Pressable>
);

/** Two-column grid for 1 (observer) or 3+ participants. */
const DefaultGrid = ({
  cameraTracks,
  controls,
  onShowScreenShare,
}: {
  cameraTracks: TrackReferenceOrPlaceholder[];
  controls: StageControls;
  onShowScreenShare?: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <View className="relative size-full">
      <ScrollView
        className="size-full"
        contentContainerClassName="flex-row flex-wrap justify-center gap-2 p-2"
      >
        {cameraTracks.map((track) => (
          <JamCallParticipant
            key={track.participant.identity}
            trackRef={track}
            size="size-40"
            {...tileProps(track, controls)}
          />
        ))}
      </ScrollView>
      {onShowScreenShare ? (
        <View className="absolute left-3 top-3 z-20">
          <StageButton
            label={t('jams.screenShare.backToPresentation')}
            onPress={onShowScreenShare}
          >
            <ScreenShareIcon size={16} className="text-foreground" />
          </StageButton>
        </View>
      ) : null}
    </View>
  );
};

/** Single local participant filling the view. */
const AloneLayout = ({ track }: { track: TrackReferenceOrPlaceholder }) => (
  <View className="size-full p-2">
    <JamCallParticipant trackRef={track} size="size-full" />
  </View>
);

/** Remote full-screen with the local participant as a picture-in-picture tile. */
const OneOnOneLayout = ({
  local,
  remote,
}: {
  local: TrackReferenceOrPlaceholder;
  remote: TrackReferenceOrPlaceholder;
}) => (
  <View className="relative size-full p-2">
    <JamCallParticipant trackRef={remote} size="size-full" />
    <View className="absolute bottom-4 right-4 size-32">
      <JamCallParticipant trackRef={local} size="size-full" />
    </View>
  </View>
);

/** Horizontal filmstrip of compact tiles below the stage or shared screen. */
const Filmstrip = ({
  tracks,
  controls,
}: {
  tracks: TrackReferenceOrPlaceholder[];
  controls: StageControls;
}) => (
  <ScrollView
    horizontal
    className="max-h-32 w-full shrink-0"
    contentContainerClassName="flex-row gap-1"
  >
    {tracks.map((track) => (
      <JamCallParticipant
        key={track.participant.identity}
        trackRef={track}
        size="size-24 shrink-0"
        compact
        {...tileProps(track, controls)}
      />
    ))}
  </ScrollView>
);

/**
 * Presented screen plus a strip of participant tiles. Only remote shares can
 * appear here: publishing a screen share is not supported on React Native.
 */
const ScreenSharingLayout = ({
  cameraTracks,
  screenShareTrack,
  controls,
  onShowGrid,
}: {
  cameraTracks: TrackReferenceOrPlaceholder[];
  screenShareTrack: TrackReferenceOrPlaceholder;
  controls: StageControls;
  onShowGrid: () => void;
}) => {
  const { t } = useTranslation();
  const profile = parseParticipantMetadata(
    screenShareTrack.participant.metadata
  ).profile;

  return (
    <View className="size-full gap-2">
      <View className="min-h-0 flex-1 gap-2">
        <View className="w-full flex-row items-center gap-x-2 py-1">
          {profile ? <AvatarWithName profile={profile} /> : null}
          <ThemedText>{t('jams.screenShare.presenting')}</ThemedText>
        </View>
        <View className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-border">
          {isTrackReference(screenShareTrack) ? (
            <VideoTrack
              trackRef={screenShareTrack}
              style={StyleSheet.absoluteFill}
              objectFit="contain"
            />
          ) : null}
          <View className="absolute left-3 top-3 z-20">
            <StageButton
              label={t('jams.screenShare.showGrid')}
              onPress={onShowGrid}
            >
              <LayoutGridIcon size={16} className="text-foreground" />
            </StageButton>
          </View>
        </View>
      </View>
      <Filmstrip
        tracks={cameraTracks}
        controls={{ ...controls, onEnlarge: undefined }}
      />
    </View>
  );
};

/** Large stage plus a filmstrip of everyone else. */
const SpeakerLayout = ({
  stage,
  cameraTracks,
  controls,
  onShowGrid,
  onShowScreenShare,
}: {
  stage: TrackReferenceOrPlaceholder;
  cameraTracks: TrackReferenceOrPlaceholder[];
  controls: StageControls;
  onShowGrid: () => void;
  onShowScreenShare?: () => void;
}) => {
  const { t } = useTranslation();
  const stageIdentity = stage.participant.identity;
  const spotlighted = stageIdentity === controls.spotlightIdentity;
  const spotlightLabel = spotlighted
    ? t('jams.speakerView.removeSpotlight')
    : t('jams.speakerView.spotlight');
  const others = cameraTracks.filter(
    (track) => track.participant.identity !== stageIdentity
  );

  return (
    <View className="size-full gap-2 p-2">
      <View className="relative min-h-0 flex-1">
        <JamCallParticipant
          trackRef={stage}
          size="size-full"
          spotlighted={spotlighted}
          onToggleSpotlight={
            controls.onToggleSpotlight
              ? () =>
                  controls.onToggleSpotlight?.(
                    spotlighted ? null : stageIdentity
                  )
              : undefined
          }
        />
        {cameraPublishing(stage) ? null : (
          <View
            pointerEvents="none"
            className="absolute inset-x-0 top-1/2 z-20 items-center px-4"
          >
            <ThemedText className="rounded-lg bg-card px-3 py-2 text-sm">
              {t('jams.speakerView.cameraOff')}
            </ThemedText>
          </View>
        )}
        <View className="absolute left-3 top-3 z-20 flex-row flex-wrap gap-2">
          {onShowScreenShare ? (
            <StageButton
              label={t('jams.screenShare.backToPresentation')}
              onPress={onShowScreenShare}
            >
              <ScreenShareIcon size={16} className="text-foreground" />
            </StageButton>
          ) : null}
          <StageButton
            label={t('jams.speakerView.showGrid')}
            onPress={onShowGrid}
          >
            <LayoutGridIcon size={16} className="text-foreground" />
          </StageButton>
          {controls.onToggleSpotlight ? (
            <StageButton
              label={spotlightLabel}
              onPress={() =>
                controls.onToggleSpotlight?.(spotlighted ? null : stageIdentity)
              }
            >
              {spotlighted ? (
                <PinOffIcon size={16} className="text-foreground" />
              ) : (
                <PinIcon size={16} className="text-foreground" />
              )}
            </StageButton>
          ) : null}
          {spotlighted ? (
            <View
              accessibilityLabel={t('jams.speakerView.spotlighted')}
              className="size-10 items-center justify-center rounded-full bg-primary"
            >
              <PinIcon size={16} className="text-primary-foreground" />
            </View>
          ) : null}
        </View>
      </View>
      <Filmstrip tracks={others} controls={controls} />
    </View>
  );
};

/**
 * Picks the in-call layout. Screen sharing stays in front. A personal pin or
 * host spotlight then fills the stage. Otherwise: alone, one-on-one, or grid.
 */
export const JamVideoLayout = ({
  cameraTracks,
  screenShareTracks,
  observer,
}: JamVideoLayoutProps) => {
  const orderedCameraTracks = sortByRaisedHand(
    cameraTracks,
    (track) => track.participant.metadata
  );
  const [screenShareTrack] = screenShareTracks;
  const {
    stageIdentity,
    spotlightIdentity,
    enlarge,
    showGrid,
    toggleSpotlight,
    showGridView,
    setShowGridView,
  } = useJamStage({
    room: useRoomContext(),
    participants: useParticipants(),
    screenSharing: !!screenShareTrack,
  });
  const controls: StageControls = {
    spotlightIdentity,
    onEnlarge: enlarge,
    onToggleSpotlight: toggleSpotlight,
  };
  const onShowScreenShare =
    screenShareTrack && showGridView ? () => setShowGridView(false) : undefined;

  if (screenShareTrack && !showGridView) {
    return (
      <ScreenSharingLayout
        cameraTracks={orderedCameraTracks}
        screenShareTrack={screenShareTrack}
        controls={controls}
        onShowGrid={() => setShowGridView(true)}
      />
    );
  }

  const stage = orderedCameraTracks.find(
    (track) => track.participant.identity === stageIdentity
  );
  if (stage) {
    return (
      <SpeakerLayout
        stage={stage}
        cameraTracks={orderedCameraTracks}
        controls={controls}
        onShowGrid={showGrid}
        onShowScreenShare={onShowScreenShare}
      />
    );
  }

  // Skip alone / one-on-one when the user explicitly chose grid view.
  if (!showGridView) {
    const [firstTrack] = orderedCameraTracks;
    if (!observer && orderedCameraTracks.length === 1 && firstTrack) {
      return <AloneLayout track={firstTrack} />;
    }

    if (!observer && orderedCameraTracks.length === 2) {
      const local = orderedCameraTracks.find(
        (track) => track.participant.isLocal
      );
      const remote = orderedCameraTracks.find(
        (track) => !track.participant.isLocal
      );
      if (local && remote) {
        return <OneOnOneLayout local={local} remote={remote} />;
      }
    }
  }

  return (
    <DefaultGrid
      cameraTracks={orderedCameraTracks}
      controls={controls}
      onShowScreenShare={onShowScreenShare}
    />
  );
};
