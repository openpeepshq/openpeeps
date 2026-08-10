import React, { forwardRef, useState, useRef } from 'react';
import {
  View,
  Text,
  Dimensions,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Button } from '~/components/ui/button';
import { AudioLinesIcon, MicIcon } from '~/components/icons';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import { MediaAttachment } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { uploadMedia } from '~/lib/uploadMedia';
import { RecordAudioSheet } from './record-audio-sheet';
import { pick } from '@react-native-documents/picker';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AudioPickerSheetProps {
  onSelect: (audioAttachments: MediaAttachment[]) => void | Promise<void>;
}

export const AudioPickerSheet = forwardRef<
  BottomSheetModal,
  AudioPickerSheetProps
>(({ onSelect }, ref) => {
  const [selectedAudios, setSelectedAudios] = useState<string[]>([]);
  const [isMultipleSelect, setIsMultipleSelect] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const createAttachment = openpeepsApi.createMediaAttachmentAction();
  const recordAudioSheetRef = useRef<BottomSheetModal>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(offset / slideSize);
    setCurrentAudioIndex(currentIndex);
  };

  const resetStates = () => {
    setSelectedAudios([]);
    setIsMultipleSelect(false);
    setCurrentAudioIndex(0);
  };

  const onConfirm = async () => {
    const audioAttachments = await Promise.all(
      selectedAudios.map(media =>
        uploadMedia({
          mediaUri: media,
          createAttachments: createAttachment,
          type: 'audio',
          usage: 'attachment',
          alt: 'audio',
        }),
      ),
    ).then(attachments => attachments.filter(Boolean) as MediaAttachment[]);
    onSelect(audioAttachments);
    resetStates();
    bottomSheetClose(ref);
  };

  const renderSelectedAudiosPreview = () => {
    if (selectedAudios.length === 0) { return null; }

    const VIDEO_WIDTH = SCREEN_WIDTH;

    return (
      <View className="w-full mb-4">
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          className="w-full aspect-square"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={VIDEO_WIDTH}>
          {selectedAudios.map((uri) => (
            <View
              key={uri}
              style={{ width: VIDEO_WIDTH }}
              className="items-center justify-center">
              <MicIcon size={24} color="white" />
            </View>
          ))}
        </ScrollView>
        {selectedAudios.length > 1 && (
          <View className="absolute bottom-4 w-full flex-row justify-center gap-2">
            {selectedAudios.map((_, index) => (
              <View
                key={index}
                className={`w-2 h-2 rounded-full ${index === currentAudioIndex ? 'bg-white' : 'bg-white/50'
                  }`}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const handleRecordComplete = async (url: string) => {
    setSelectedAudios([...selectedAudios, url]);
    recordAudioSheetRef.current?.close();
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1">
        {renderSelectedAudiosPreview()}

        <View className="flex-row justify-between items-center px-4 py-3">
          <View className="flex-row items-center gap-4">
            <Button
              variant={isMultipleSelect ? 'secondary' : 'ghost'}
              size={'sm'}
              onPress={() => setIsMultipleSelect(!isMultipleSelect)}>
              <Text className="text-foreground text-base font-medium">
                {t('common.form.selectMultiple')}
              </Text>
            </Button>
            {/* <Button
              variant={'outline'}
              size={'icon'}
              className="rounded-full"
              onPress={handleMicrophonePress}>
              <MicIcon size={16} className="text-foreground" />
            </Button> */}
          </View>
        </View>

        <Button
          variant={'ghost'}
          onPress={async () => {
            const result = await pick({
              type: 'audio',
              multiple: isMultipleSelect,
            });
            if (result) {
              setSelectedAudios([...selectedAudios, ...result.map(r => r.uri)]);
            }
          }}>
          <AudioLinesIcon size={16} className="text-foreground" />
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
