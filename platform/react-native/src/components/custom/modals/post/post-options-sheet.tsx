import React, { forwardRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  ImageIcon,
  FilmIcon,
  ChartColumnIcon,
  UsersIcon,
  CalendarIcon,
} from '../../../icons';
import { BaseSheet } from '../common';
import { useTranslation } from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '../../../../lib/bottom-sheet-ref';

const options = [
  { id: 'image', title: 'Image', icon: ImageIcon },
  // { id: 'audio', title: 'Audio', icon: MicIcon },
  { id: 'video', title: 'Video', icon: FilmIcon },
  { id: 'poll', title: 'Poll', icon: ChartColumnIcon },
  { id: 'jam', title: 'Jam', icon: UsersIcon },
  { id: 'event', title: 'Event', icon: CalendarIcon },
];

interface PostOptionsSheetProps {
  onSelect: (option: string) => void;
}

export const PostOptionsSheet = forwardRef<
  BottomSheetModal,
  PostOptionsSheetProps
>(({ onSelect }, ref) => {
  const { t } = useTranslation();

  return (
    <BaseSheet ref={ref} enableOverDrag={false}>
      <View className="flex-1 px-4 pt-2 pb-8">
        <View className="flex-row flex-wrap justify-between">
          {options.map(option => (
            <TouchableOpacity
              key={option.id}
              className="w-[33%] items-center py-4 active:opacity-70"
              onPress={() => {
                onSelect(option.id);
                bottomSheetClose(ref);
              }}>
              <View className="w-14 h-14 rounded-full bg-muted items-center justify-center mb-2">
                <option.icon size={24} className="text-foreground" />
              </View>
              <Text className="text-foreground font-semibold tracking-wider text-center">
                {t(`post.options.${option.id}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </BaseSheet>
  );
});
