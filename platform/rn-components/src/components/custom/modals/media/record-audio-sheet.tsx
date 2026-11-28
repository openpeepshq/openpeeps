import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View, PermissionsAndroid, Platform } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '../../../ui/themed-text';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import { createSound } from 'react-native-nitro-sound';
import RNFS from 'react-native-fs';
import { Button } from '../../../ui/button';
import {
  CircleIcon,
  PauseIcon,
  PlayIcon,
  Repeat2Icon,
  SquareIcon,
} from '../../../icons/index';
import { bottomSheetDismiss } from '../../../../lib/bottom-sheet-ref';
import {
  VOICE_NOTE_AUTO_STOP_SECONDS,
  VOICE_NOTE_MAX_SECONDS,
} from '@openpeepshq/common';

interface RecordAudioSheetProps {
  onComplete: (url: string) => Promise<void> | void;
}

// The package's index.d.ts star-exports the `Sound` interface but also
// declares and explicitly `export { Sound }` a `const Sound` of that type —
// the explicit value shadows the star-re-exported interface, so `Sound`
// cannot be imported as a type. Derive the instance type from the factory.
type SoundInstance = ReturnType<typeof createSound>;

/**
 * Records a voice note (up to VOICE_NOTE_MAX_SECONDS) for the composer.
 *
 * The auto-stop is driven by a wall-clock interval (Date.now() deltas) rather
 * than the recorder's throttle-racy position callback — the same guard the web
 * VoiceRecorderModal uses — so the take cannot overshoot the cap, and a
 * completed take is confirmable from the file the stop returns even if the
 * last position callback never lands.
 */
export const RecordAudioSheet = forwardRef<
  BottomSheetModal,
  RecordAudioSheetProps
>(({ onComplete }, ref) => {
  const { t } = useTranslation();

  // Lazy: one native sound (recorder+player) per mounted sheet, not a new
  // object per render. `createSound()` is the nitro-sound replacement for the
  // old library's `new AudioRecorderPlayer()` constructor.
  const recorderRef = useRef<SoundInstance | null>(null);
  const getRecorder = () => {
    if (!recorderRef.current) recorderRef.current = createSound();
    return recorderRef.current;
  };

  const [url, setUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<'denied' | 'failed' | null>(null);
  const [recordTime, setRecordTime] = useState('00:00');
  const [playTime, setPlayTime] = useState('00:00');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // True once stopRecorder has landed — the take is playable and confirmable.
  const [isStopped, setIsStopped] = useState(false);
  // Mirrors isRecording for the unmount/dismiss path, where the closure's
  // state is stale and we still need to know whether the mic is hot.
  const isRecordingRef = useRef(false);

  // Wall-clock tracking: the display time and the auto-stop derive from
  // Date.now() deltas (minus paused spans), so a background-throttled tick
  // cannot let the take overshoot the cap.
  const accumulatedMsRef = useRef(0);
  const segmentStartedAtRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);

  const elapsedMs = () =>
    accumulatedMsRef.current +
    (segmentStartedAtRef.current !== null
      ? Date.now() - segmentStartedAtRef.current
      : 0);

  const getRecordPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      return status === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }, []);

  const teardownListeners = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.removeRecordBackListener();
    recorder.removePlayBackListener();
    recorder.removePlaybackEndListener();
  };

  // Clean up the native listeners and release the mic if the sheet unmounts
  // mid-take, so the recorder/player are not left registered or running.
  useEffect(
    () => () => {
      teardownListeners();
      const recorder = recorderRef.current;
      if (recorder) {
        // The take is discarded, not confirmed — stop it and release the mic.
        if (isRecordingRef.current) {
          void recorder
            .stopRecorder()
            .catch(() => undefined)
            .finally(() => teardownListeners());
          isRecordingRef.current = false;
        }
        void recorder.stopPlayer().catch(() => undefined);
      }
    },
    []
  );

  // The Android mic permission is requested lazily in onStartRecord (when the
  // user actually starts a take) rather than on mount, so a parent remount of
  // the sheet does not re-fire the system prompt before the user has asked to
  // record. iOS raises its system prompt on first use.

  const reset = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsPaused(false);
    setIsPlaying(false);
    setPlayTime('00:00');
    setRecordTime('00:00');
    setIsStopped(false);
    stoppingRef.current = false;
    accumulatedMsRef.current = 0;
    segmentStartedAtRef.current = null;
  };

  const onStartRecord = async () => {
    setMicError(null);
    if (!(await getRecordPermission())) {
      setMicError('denied');
      return;
    }
    const recorder = getRecorder();
    try {
      recorder.removeRecordBackListener();
      // No explicit audioSet: the `.m4a`/`audio/mp4` name+mimetype trusted in
      // `uploadMedia` (isRecordedAudio) depends on react-native-nitro-sound's
      // defaults — Android: OutputFormat.MPEG_4 + AudioEncoder.AAC → .mp4/AAC;
      // iOS: AVFormatIDKey unset → AAC → .m4a/AAC. These defaults are for the
      // version the lockfile resolves to (0.2.21); CI installs from that lock,
      // so the build matches these defaults. Do not change the recorder's
      // output defaults — via an explicit audioSet or a dependency bump that
      // changes them — without re-checking the `.m4a`/`audio/mp4` trust in
      // `uploadMedia`'s `isRecordedAudio` branch.
      //
      // Unique path per take: both platforms write a caller-supplied path
      // verbatim (Android uses it directly; iOS resolves it as an absolute
      // path), so a fresh name per take keeps each take's bytes independent of
      // the library's own default file. The `.m4a` suffix keeps the name
      // honest on both platforms — Android's MPEG_4/AAC output is audio/mp4-
      // shaped like iOS's m4a, and `uploadMedia` (isRecordedAudio) maps the
      // recorded output to audio/mp4 regardless.
      const outputPath = `${RNFS.CachesDirectoryPath}/voice_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}.m4a`;
      setUrl(await recorder.startRecorder(outputPath));
      setPlayTime('00:00');
      setIsRecording(true);
      isRecordingRef.current = true;
      setIsPaused(false);
      setIsStopped(false);
      setRecordTime('00:00');
      stoppingRef.current = false;
      accumulatedMsRef.current = 0;
      segmentStartedAtRef.current = Date.now();
    } catch {
      setMicError('failed');
    }
  };

  const onStopRecord = async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    segmentStartedAtRef.current = null;
    const recorder = recorderRef.current;
    if (!recorder) return;
    try {
      // The returned path is the recorded file — a completed take is
      // confirmable even if the last position callback never arrived.
      const stoppedUrl = await recorder.stopRecorder();
      // Commit the stopped UI state only once stop actually resolved, so a
      // rejected stop never shows a playback section for a take that was
      // never produced.
      setIsStopped(true);
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
      if (stoppedUrl) setUrl(stoppedUrl);
    } catch {
      // The mic stayed hot; the take is not usable — the error path is the
      // same `micError` state a failed start produces.
      setMicError('failed');
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
    } finally {
      recorder.removeRecordBackListener();
    }
  };

  const onPauseRecord = async () => {
    if (stoppingRef.current) return;
    const recorder = recorderRef.current;
    if (recorder) await recorder.pauseRecorder();
    if (segmentStartedAtRef.current !== null) {
      accumulatedMsRef.current += Date.now() - segmentStartedAtRef.current;
      segmentStartedAtRef.current = null;
    }
    setIsPaused(true);
  };

  const onResumeRecord = async () => {
    const recorder = recorderRef.current;
    if (recorder) await recorder.resumeRecorder();
    segmentStartedAtRef.current = Date.now();
    setIsPaused(false);
  };

  const onStartPlay = async () => {
    const recorder = getRecorder();
    // The take's own path: startPlayer(uri) resolves a falsy uri to the
    // library's "DEFAULT", a *fixed* cache file (sound.mp4/sound.m4a) — with
    // per-take filenames that file is never the confirmed take, so the
    // preview would play the wrong audio or error. The state holds the
    // `file://`-normalized stopRecorder() result, the same value
    // `handleConfirm` hands to `onComplete`.
    if (!url) return;
    await recorder.startPlayer(url);
    recorder.addPlayBackListener((e) => {
      setPlayTime(recorder.mmss(Math.floor(e.currentPosition / 1000)));
    });
    // Natural end of the take: nitro-sound reports playback finishing on its
    // own through the dedicated playback-end listener (the old library folded
    // this into the position callback's `isFinished` flag). Tear down the
    // player and reset the play state so one tap replays — parity with the
    // picker sheet's end-of-playback transition.
    recorder.addPlaybackEndListener(() => {
      void onStopPlay();
    });
    setIsPlaying(true);
    setIsPaused(false);
  };

  const onPausePlay = async () => {
    const recorder = recorderRef.current;
    if (recorder) await recorder.pausePlayer();
    setIsPaused(true);
  };

  const onResumePlay = async () => {
    const recorder = recorderRef.current;
    if (recorder) await recorder.resumePlayer();
    setIsPaused(false);
  };

  const onStopPlay = async () => {
    const recorder = recorderRef.current;
    if (recorder) {
      await recorder.stopPlayer();
      recorder.removePlayBackListener();
      recorder.removePlaybackEndListener();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setPlayTime('00:00');
  };

  // Display wall-clock time and enforce the hard cap from a wall-clock tick.
  // The auto-stop threshold is half a second *under* the cap (`VOICE_NOTE_AUTO_STOP_SECONDS`):
  // this tick is 500 ms coarse and the take's probed duration is the raw
  // wall-clock span, so stopping at exactly 90 s would let ~half of honest
  // cap-length takes probe above the server's `> VOICE_NOTE_MAX_SECONDS`
  // check. See the constant's docs (common) for the boundary story.
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const id = setInterval(() => {
      const elapsedSeconds = Math.floor(elapsedMs() / 1000);
      const recorder = recorderRef.current;
      if (recorder) setRecordTime(recorder.mmss(elapsedSeconds));
      if (
        elapsedMs() >= VOICE_NOTE_AUTO_STOP_SECONDS * 1000 &&
        !stoppingRef.current
      ) {
        void onStopRecord();
      }
    }, 500);
    return () => clearInterval(id);
  }, [isRecording, isPaused]);

  const handleConfirm = async () => {
    if (url && isStopped) {
      await onComplete(url);
    }
  };

  // Discard the take and return to the idle state — a bad take can be
  // re-recorded without the dismiss-and-reopen round trip the web modal's
  // Re-record button offers.
  const handleReRecord = () => {
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.removePlayBackListener();
      recorder.removePlaybackEndListener();
      void recorder.stopPlayer().catch(() => undefined);
    }
    setUrl(null);
    reset();
  };

  const hasTake = !!url;
  const micErrorCopy =
    micError === 'denied'
      ? t('posts.form.voiceNote.micError')
      : t('posts.form.voiceNote.micFailed');

  // If the user swipes/back-dismisses the sheet while recording, the mic must
  // not keep running — stop the in-progress take before the state is cleared.
  const handleDismiss = () => {
    const recorder = recorderRef.current;
    if (recorder && isRecordingRef.current) {
      void recorder
        .stopRecorder()
        .catch(() => undefined)
        .finally(() => teardownListeners());
    }
    isRecordingRef.current = false;
    setUrl(null);
    reset();
  };

  return (
    <BaseSheet ref={ref} onDismiss={handleDismiss}>
      <View className="flex-1 p-4 justify-between">
        <ThemedText>{t('common.media.audio.record')}</ThemedText>
        <ThemedText className="text-muted-foreground">
          {t('common.media.audio.maxLength', {
            seconds: VOICE_NOTE_MAX_SECONDS,
          })}
        </ThemedText>
        <View className="flex-1">
          <View>
            {/* Consent sits directly above the controls so it is read before
                the user can start recording, not discovered under them. */}
            <ThemedText className="text-muted-foreground">
              {t('common.media.audio.whyPermission')}
            </ThemedText>
            {micError && (
              <ThemedText className="text-destructive">
                {micErrorCopy}
              </ThemedText>
            )}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                {!isRecording && !isPaused && !hasTake && (
                  <Button onPress={onStartRecord} size="icon" variant={'ghost'}>
                    <CircleIcon size={24} className="text-foreground" />
                  </Button>
                )}
                {isRecording && !isPaused && (
                  <Button onPress={onPauseRecord} variant={'ghost'}>
                    <PauseIcon size={24} className="text-foreground" />
                  </Button>
                )}
                {isRecording && isPaused && (
                  <Button onPress={onResumeRecord} variant={'ghost'}>
                    <CircleIcon size={24} className="text-foreground" />
                  </Button>
                )}
                {isRecording && (
                  <Button onPress={onStopRecord} variant={'ghost'}>
                    <SquareIcon size={24} className="text-foreground" />
                  </Button>
                )}
              </View>
              {hasTake && <ThemedText>{recordTime}</ThemedText>}
            </View>
          </View>
        </View>
        {isStopped && (
          <View>
            {/*
              Round-17 item 1: `common.media.audio.play` was re-checked against
              every repo consumer. `record-audio-sheet.tsx` (pre-existing on
              main, not just this PR) and the `audio-picker-sheet` preview
              button both read it; the PR's shortened "Play"/"Abspielen" copy
              would have silently changed that pre-existing label. The values
              were therefore restored to main's originals ("Play audio" /
              "Audio abspielen") rather than introducing a dedicated key — the
              preview play button is fine reading the longer copy.
            */}
            <ThemedText>{t('common.media.audio.play')}</ThemedText>
            <ThemedText>
              {playTime} / {recordTime}
            </ThemedText>
            <View className="flex-row items-center">
              {!isPlaying && (
                <Button onPress={onStartPlay} variant={'ghost'}>
                  <PlayIcon size={24} className="text-foreground" />
                </Button>
              )}
              {isPlaying && !isPaused && (
                <Button onPress={onPausePlay} variant={'ghost'}>
                  <PauseIcon size={24} className="text-foreground" />
                </Button>
              )}
              {isPlaying && isPaused && (
                <Button onPress={onResumePlay} variant={'ghost'}>
                  <PlayIcon size={24} className="text-foreground" />
                </Button>
              )}
              {isPlaying && (
                <Button onPress={onStopPlay} variant={'ghost'}>
                  <SquareIcon size={24} className="text-foreground" />
                </Button>
              )}
              <Button
                onPress={handleReRecord}
                variant={'ghost'}
                accessibilityLabel={t('posts.form.voiceNote.reRecord')}
              >
                <Repeat2Icon size={24} className="text-foreground" />
              </Button>
            </View>
          </View>
        )}
        <SheetFooter
          onCancel={() => bottomSheetDismiss(ref)}
          onConfirm={handleConfirm}
          disabled={!url || !isStopped}
          confirmText={t('common.done')}
        />
      </View>
    </BaseSheet>
  );
});
