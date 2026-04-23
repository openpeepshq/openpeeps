import React, { forwardRef } from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Text } from '~/components/ui/text';
import { PublicProfile } from '@openpeeps/common';
import { useOpenpeeps } from '@openpeeps/react';
import { BaseSheet } from '../common';
import { FollowUnfollowButton } from '../../profile';
import { useTranslation } from 'react-i18next';

import { useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileAvatar } from '../../profile/profile-avatar';

interface ParticipantsSheetProps {
  participants: PublicProfile[];
}

export const ParticipantsSheet = forwardRef<
  BottomSheetModal,
  ParticipantsSheetProps
>(({ participants }, ref) => {
  const { currentProfile } = useOpenpeeps();
  const { t } = useTranslation();

  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const renderParticipant = ({ item }: { item: PublicProfile }) => (
    <View className="flex-row items-center justify-between px-4 py-3 hover:bg-muted/50">
      <View className="flex-row items-center gap-x-3">
        <TouchableOpacity
          onPress={() => {
            // @ts-ignore
            ref?.current?.close();
            navigation.navigate('Profile', {
              handle: item.handle,
            });
          }}>
          <ProfileAvatar profile={item} />
        </TouchableOpacity>
        <View>
          <Text className="font-medium text-base">{item.displayName}</Text>
          <Text className="text-sm text-muted-foreground">@{item.handle}</Text>
        </View>
      </View>
      {item.id !== currentProfile?.id && (
        <FollowUnfollowButton profile={item} useDifferentVariant={true} />
      )}
    </View>
  );

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1">
        <View className="px-4 py-3 border-b border-border">
          <Text className="text-lg text-center font-semibold">
            {t('jam.participants.title', { count: participants.length })}
          </Text>
        </View>
        <FlatList
          className="flex-1"
          data={[
            // @ts-ignore
            {
              id: currentProfile?.id || '',
              ...currentProfile,
              displayName: t('common.you'),
            },
            ...participants.filter(p => p.id !== currentProfile?.id),
          ]}
          renderItem={renderParticipant}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </BaseSheet>
  );
});
