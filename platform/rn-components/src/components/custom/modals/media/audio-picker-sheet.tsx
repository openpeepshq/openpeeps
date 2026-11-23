import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { View, Text } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Button } from '../../../ui/button';
import { AudioLinesIcon, MicIcon } from '../../../icons/index';
import { PauseIcon, PlayIcon } from '../../../icons/index';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { MediaAttachment } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { uploadMedia } from '../../../../lib/uploadMedia';
import { RecordAudioSheet } from './record-audio-sheet';
import {
  pick,
  type DocumentPickerResponse,
} from '@react-native-documents/picker';
import { bottomSheetClose } from '../../../../lib/bottom-sheet-ref';

interface AudioPickerSheetProps {
  onSelect: (audioAttachments: MediaAttachment[]) => void | Promise<void>;
  /** When false, the sheet selects a single file (no multiple toggle). */
  multiple?: boolean;
}

export const AudioPickerSheet = forwardRef<
  BottomSheetModal,
  AudioPickerSheetProps
>(({ onSelect, multiple = true }, ref) => {
  const [selectedAudios, setSelectedAudios] = useState<string[]>([]);
  // URIs that came from a confirmed recording (not the file picker), so Done
  // can tell the recorder's .m4a output apart from a picked container.
  const [recordedUrls, setRecordedUrls] = useState<Set<string>>(new Set());
  // The document picker's `name`/`type` per picked URI. Recordings never go
  // through the file picker, so a URI found here is a picked file by
  // definition.
  const [pickMeta, setPickMeta] = useState<Map<string, DocumentPickerResponse>>(
    new Map()
  );
  const [isMultipleSelect, setIsMultipleSelect] = useState(false);
  // The one take currently playing in the preview (web's picker shows an
  // <audio controls> per selection; RN has no scrub bar, so the equivalent
  // parity is a play/pause affordance on the visible take).
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const playerRef = useRef<AudioRecorderPlayer | null>(null);
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const createAttachment = openpeepsApi.createMediaAttachmentAction();
  const recordAudioSheetRef = useRef<BottomSheetModal>(null);

  // Preview player for the visible take. Created lazily on first play and
  // torn down by `stopPreviewPlayback` (Done/Cancel, a replaced selection,
  // or unmount) so a confirmed take never keeps playing after the sheet is
  // gone.
  const stopPreviewPlayback = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      player.removePlayBackListener();
      void player.stopPlayer().catch(() => undefined);
      playerRef.current = null;
    }
    setPlayingUri(null);
  }, []);

  const togglePreviewPlayback = (uri: string) => {
    if (playingUri === uri) {
      stopPreviewPlayback();
      return;
    }
    const player = (playerRef.current ??= new AudioRecorderPlayer());
    void (async () => {
      if (playingUri) await player.stopPlayer().catch(() => undefined);
      await player.startPlayer(uri);
      player.addPlayBackListener((e) => {
        // The native player reports the end of the take through
        // `isFinished` (the callback keeps firing while playing, so the
        // flag distinguishes natural end from a user stop, which goes
        // through `stopPreviewPlayback` and never sets it) — the same
        // end-of-playback transition web's <audio> gets from `ended`.
        if (e.isFinished) stopPreviewPlayback();
      });
      setPlayingUri(uri);
    })().catch(() => stopPreviewPlayback());
  };

  // A take in flight must not outlive the sheet.
  useEffect(
    () => () => {
      const player = playerRef.current;
      if (player) {
        player.removePlayBackListener();
        void player.stopPlayer().catch(() => undefined);
      }
    },
    []
  );

  const resetStates = () => {
    setSelectedAudios([]);
    setRecordedUrls(new Set());
    setPickMeta(new Map());
    setIsMultipleSelect(false);
    stopPreviewPlayback();
  };

  const onConfirm = async () => {
    const results = await Promise.all(
      selectedAudios.map((media) =>
        uploadMedia({
          mediaUri: media,
          createAttachments: createAttachment,
          type: 'audio',
          // Web tags composer audio `post-audio` in
          // `platform/react/src/components/post/post-form/ComposeAttachments.tsx`
          // (`usageForFile`, reached from `enqueueFile`); RN mirrors it so
          // server/client logic keyed on the value sees one tag across
          // platforms.
          usage: 'post-audio',
          alt: 'audio',
          // Recordings are the recorder's own .m4a output; picked files are
          // not, and their reported name/mimetype must match their bytes.
          isRecordedAudio: recordedUrls.has(media),
          // Picked files carry the document picker's authoritative name/type
          // (an opaque content:// URI has no extension to guess from). A
          // `null` here marks a recording, whose known .m4a output is
          // trusted instead — uploadMedia falls back to the URI inference
          // only when both are missing.
          name: pickMeta.get(media)?.name ?? null,
          mimeType: pickMeta.get(media)?.type ?? null,
        })
      )
    );
    const attachments = results.filter(Boolean) as MediaAttachment[];
    if (results.every((r) => !r)) {
      // Every upload failed (e.g. the server rejected an over-cap audio):
      // keep the sheet open with the takes/selection intact so the user can
      // retry instead of re-recording from scratch.
      return;
    }
    // Partial failure (some uploads succeed): close with the successes and
    // drop the failed takes — each failure is already reported by the
    // per-upload error toast in uploadMedia.
    onSelect(attachments);
    resetStates();
    bottomSheetClose(ref);
  };

  const renderSelectedAudiosPreview = () => {
    if (selectedAudios.length === 0) {
      return null;
    }

    // The paged carousel would need a per-slide player to stay in sync as it
    // scrolls; the visible take gets a play/pause instead (parity with web's
    // <audio controls>, without a scrub bar RN has no hook for).
    const visibleUri = selectedAudios[0];
    const isPlaying = playingUri === visibleUri;
    // The icon toggles Play/Pause, so the label must track the state too —
    // a static "Play audio" would misdescribe the control while playing.
    const playLabel = t(
      isPlaying ? 'common.media.audio.pause' : 'common.media.audio.play'
    );

    return (
      <View className="w-full mb-4 items-center justify-center py-6">
        <View className="flex-row items-center gap-4">
          <Button
            variant={'ghost'}
            accessibilityLabel={playLabel}
            onPress={() => togglePreviewPlayback(visibleUri)}
          >
            {isPlaying ? (
              <PauseIcon size={24} color="white" />
            ) : (
              <PlayIcon size={24} color="white" />
            )}
          </Button>
        </View>
        {selectedAudios.length > 1 && (
          <View className="absolute bottom-4 w-full flex-row justify-center gap-2">
            {selectedAudios.map((_, index) => (
              <View
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === 0 ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const handleRecordComplete = async (recordedUri: string) => {
    // `recordedUri` is the single take the record sheet just confirmed — the
    // sheet's payload is a bare string, not the picker's `MediaAttachment[]`
    // selection, so it is kept a distinct identifier from `selectedAudios`.
    // Single mode replaces (the pick path above does the same), so a second
    // confirmed recording cannot leave two takes selected with one Done.
    // The replaced take's URI is dropped from `recordedUrls` too, so the set
    // does not accumulate stale entries across re-records (review item 10).
    if (multiple) {
      setSelectedAudios([...selectedAudios, recordedUri]);
    } else {
      const replaced = selectedAudios[0];
      // The replacement drops the visible take (mirroring the pick path): if
      // a preview was playing the replaced take, stopping it here keeps the
      // `playingUri`/label in sync with the now-visible take instead of
      // keeping a discarded take audible (unique per-take paths mean the old
      // file still exists and would keep playing).
      stopPreviewPlayback();
      setSelectedAudios([recordedUri]);
      setRecordedUrls((prev) => {
        const next = new Set(prev);
        if (replaced) next.delete(replaced);
        next.add(recordedUri);
        return next;
      });
      recordAudioSheetRef.current?.close();
      return;
    }
    setRecordedUrls((prev) => new Set(prev).add(recordedUri));
    recordAudioSheetRef.current?.close();
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1">
        {renderSelectedAudiosPreview()}

        {multiple ? (
          <View className="flex-row justify-between items-center px-4 py-3">
            <View className="flex-row items-center gap-4">
              <Button
                variant={isMultipleSelect ? 'secondary' : 'ghost'}
                size={'sm'}
                onPress={() => setIsMultipleSelect(!isMultipleSelect)}
              >
                <Text className="text-foreground text-base font-medium">
                  {t('common.form.selectMultiple')}
                </Text>
              </Button>
            </View>
          </View>
        ) : null}

        <Button
          variant={'ghost'}
          onPress={async () => {
            const result = await pick({
              type: 'audio',
              multiple: multiple && isMultipleSelect,
            });
            if (result) {
              const uris = result.map((r) => r.uri);
              // Single mode replaces the pick; multiple mode appends. Picked
              // files replace the visible take, so its preview stops.
              stopPreviewPlayback();
              setSelectedAudios(multiple ? [...selectedAudios, ...uris] : uris);
              // The picker's `name`/`type` are the file's authoritative
              // metadata (an opaque content:// URI carries no extension to
              // guess from) — kept alongside the URI so Done can hand them to
              // uploadMedia. Picked files are never the recorder's output.
              setPickMeta((prev) => {
                const next: Map<string, DocumentPickerResponse> = multiple
                  ? new Map(prev)
                  : new Map();
                for (const r of result) next.set(r.uri, r);
                return next;
              });
            }
          }}
        >
          <AudioLinesIcon size={16} className="text-foreground" />
        </Button>

        <Button
          variant={'ghost'}
          accessibilityLabel={t('posts.form.recordVoice')}
          onPress={() => recordAudioSheetRef.current?.present()}
        >
          <MicIcon size={16} className="text-foreground" />
        </Button>

        <SheetFooter
          onCancel={() => {
            resetStates();
            bottomSheetClose(ref);
          }}
          onConfirm={onConfirm}
          disabled={selectedAudios.length === 0}
          confirmText={t('common.done')}
        />
        <RecordAudioSheet
          ref={recordAudioSheetRef}
          onComplete={handleRecordComplete}
        />
      </View>
    </BaseSheet>
  );
});
