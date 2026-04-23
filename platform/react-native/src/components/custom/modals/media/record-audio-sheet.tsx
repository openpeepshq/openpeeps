import React, { forwardRef, useCallback, useState } from 'react';
import { View, PermissionsAndroid, Platform } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '../../../ui/themed-text';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { Button } from '../../../ui/button';
import { CircleIcon, PauseIcon, PlayIcon, SquareIcon } from '../../../icons';
import { bottomSheetClose, bottomSheetDismiss } from '../../../../lib/bottom-sheet-ref';

interface RecordAudioSheetProps {
  onComplete: (url: string) => Promise<void> | void;
}


export const RecordAudioSheet = forwardRef<BottomSheetModal, RecordAudioSheetProps>(
  ({ onComplete }, ref) => {
    const { t } = useTranslation();

    const getAndroidPermission = useCallback(async () => {
      if (Platform.OS === 'android') {
        try {
          const grants = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);

          if (!(
            grants['android.permission.WRITE_EXTERNAL_STORAGE'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
            grants['android.permission.READ_EXTERNAL_STORAGE'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
            grants['android.permission.RECORD_AUDIO'] ===
            PermissionsAndroid.RESULTS.GRANTED
          )) {
            Toast.show({
              text1: t('common.permissions.required'),
              type: 'error',
            });
            bottomSheetDismiss(ref);
          }
        } catch (err) {
          Toast.show({
            text1: t('common.permissions.required'),
            type: 'error',
          });
          bottomSheetDismiss(ref);
        }
      }
    }, [ref, t]);
    const [url, setUrl] = useState<string | null>(null);
    const [recordTime, setRecordTime] = useState('00:00');
    const [recordSecs, setRecordSecs] = useState(0);
    const [playTime, setPlayTime] = useState('00:00');
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const audioRecorderPlayer = new AudioRecorderPlayer();

    const onStartRecord = async () => {
      setUrl(await audioRecorderPlayer.startRecorder());
      setIsRecording(true);
      setRecordSecs(0);
      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordSecs(e.currentPosition);
        setRecordTime(audioRecorderPlayer.mmss(
          Math.floor(e.currentPosition / 1000),
        ));
        return;
      });
    };


    const reset = () => {
      console.log('url', url);
      console.log('reset');
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
      console.log('onStopRecord');
      setIsRecording(false);
      setIsPaused(false);
      await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
    };

    const onStartPlay = async () => {
      await audioRecorderPlayer.startPlayer();
      audioRecorderPlayer.addPlayBackListener((e) => {
        setPlayTime(audioRecorderPlayer.mmss(
          Math.floor(e.currentPosition / 1000),
        ));
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

    // Update altText state if initialAltText prop changes
    React.useEffect(() => {
      getAndroidPermission();
    }, [getAndroidPermission]);

    return (
      <BaseSheet ref={ref} onDismiss={() => { setUrl(null); reset(); }}>
        <View className="flex-1 p-4 justify-between">
          <ThemedText>{t('common.media.audio.record')}</ThemedText>
          <ThemedText>{recordSecs} {String(isRecording)} {String(isPaused)} {String(isPlaying)} {playTime}</ThemedText>
          <ThemedText>{url}</ThemedText>
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
          {!isRecording && !!url && !!recordSecs &&
            <View>
              <ThemedText>{t('common.media.audio.play')}</ThemedText>
              <ThemedText>
                {playTime} / {recordTime}
              </ThemedText>
              <View className="flex-row items-center">
                {!isPlaying && <Button onPress={onStartPlay} variant={'ghost'}>
                  <PlayIcon size={24} className="text-foreground" />
                </Button>}
                {isPlaying && <Button onPress={onPausePlay} variant={'ghost'}>
                  <PauseIcon size={24} className="text-foreground" />
                </Button>}
                {isPlaying && isPaused && <Button onPress={onResumePlay} variant={'ghost'}>
                  <PlayIcon size={24} className="text-foreground" />
                </Button>}
                {isPlaying && <Button onPress={onStopPlay} variant={'ghost'}>
                  <SquareIcon size={24} className="text-foreground" />
                </Button>}
              </View>
            </View>}
          <SheetFooter
            onCancel={() => bottomSheetDismiss(ref)}
            onConfirm={handleConfirm}
            confirmText={t('common.done')}
          />
        </View>
      </BaseSheet>
    );
  },
);
