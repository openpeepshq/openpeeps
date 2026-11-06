import React, { forwardRef, useCallback, useState } from 'react';
import { View, PermissionsAndroid, Platform } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '../../../ui/themed-text';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { Button } from '../../../ui/button';
import {
  CircleIcon,
  PauseIcon,
  PlayIcon,
  SquareIcon,
} from '../../../icons/index';
import { bottomSheetDismiss } from '../../../../lib/bottom-sheet-ref';
import { VOICE_NOTE_MAX_SECONDS } from '@openpeepshq/common';

const MAX_RECORD_MS = VOICE_NOTE_MAX_SECONDS * 1000;

interface RecordAudioSheetProps {
  onComplete: (url: string) => Promise<void> | void;
}

export const RecordAudioSheet = forwardRef<
  BottomSheetModal,
  RecordAudioSheetProps
>(({ onComplete }, ref) => {
  const { t } = useTranslation();

  // Android: the runtime permission must be requested from JS. iOS: the
  // native recorder triggers the system mic prompt on first use; a denial
  // surfaces as a startRecorder failure in onStartRecord.
  const getRecordPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }
    try {
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      return status === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }, []);
  const [url, setUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [recordTime, setRecordTime] = useState('00:00');
  const [recordSecs, setRecordSecs] = useState(0);
  const [playTime, setPlayTime] = useState('00:00');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const audioRecorderPlayer = new AudioRecorderPlayer();

  const onStartRecord = async () => {
    setMicError(null);
    if (!(await getRecordPermission())) {
      setMicError(t('posts.form.voiceNote.micError'));
      return;
    }
    try {
      setUrl(await audioRecorderPlayer.startRecorder());
      setIsRecording(true);
      setRecordSecs(0);
      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordSecs(e.currentPosition);
        setRecordTime(
          audioRecorderPlayer.mmss(Math.floor(e.currentPosition / 1000))
        );
        if (e.currentPosition >= MAX_RECORD_MS) {
          audioRecorderPlayer.removeRecordBackListener();
          void onStopRecord();
        }
      });
    } catch {
      setMicError(t('posts.form.voiceNote.micError'));
    }
  };

  const reset = () => {
    setIsRecording(false);
    setIsPaused(false);
    setIsPlaying(false);
    setPlayTime('00:00');
    setRecordSecs(0);
    setRecordTime('00:00');
  };

  const onPauseRecord = async () => {
    await audioRecorderPlayer.pauseRecorder();
    setIsPaused(true);
  };

  const onResumeRecord = async () => {
    await audioRecorderPlayer.resumeRecorder();
    setIsPaused(false);
    setIsRecording(true);
  };

  const onStopRecord = async () => {
    setIsRecording(false);
    setIsPaused(false);
    await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener();
  };

  const onStartPlay = async () => {
    await audioRecorderPlayer.startPlayer();
    audioRecorderPlayer.addPlayBackListener((e) => {
      setPlayTime(
        audioRecorderPlayer.mmss(Math.floor(e.currentPosition / 1000))
      );
      return;
    });
  };

  const onPausePlay = async () => {
    await audioRecorderPlayer.pausePlayer();
  };

  const onResumePlay = async () => {
    await audioRecorderPlayer.resumePlayer();
  };

  const onStopPlay = async () => {
    await audioRecorderPlayer.stopPlayer();
    audioRecorderPlayer.removePlayBackListener();
  };

  const handleConfirm = async () => {
    if (url) {
      await onComplete(url);
    }
  };

  return (
    <BaseSheet
      ref={ref}
      onDismiss={() => {
        setUrl(null);
        reset();
      }}
    >
      <View className="flex-1 p-4 justify-between">
        <ThemedText>{t('common.media.audio.record')}</ThemedText>
        <ThemedText className="text-muted-foreground">
          {t('common.media.audio.maxLength', {
            seconds: VOICE_NOTE_MAX_SECONDS,
          })}
        </ThemedText>
        {micError && (
          <ThemedText className="text-destructive">{micError}</ThemedText>
        )}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            {!isRecording && !isPaused && (
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
          {!!url && <ThemedText>{recordTime}</ThemedText>}
        </View>
        {!isRecording && !!url && !!recordSecs && (
          <View>
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
              {isPlaying && (
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
            </View>
          </View>
        )}
        <SheetFooter
          onCancel={() => bottomSheetDismiss(ref)}
          onConfirm={handleConfirm}
          confirmText={t('common.done')}
        />
      </View>
    </BaseSheet>
  );
});
