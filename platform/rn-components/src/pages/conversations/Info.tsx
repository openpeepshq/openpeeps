import { useTranslation } from 'react-i18next';
import React from 'react';
import {
  MainScreenProps,
  MainStackParamList,
} from '../../components/navigation/types/index';
import { useOpenpeeps } from '@openpeepshq/react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ui/themed-text';
import { FollowUnfollowButton } from '../../components/profile/FollowUnfollowButton';

import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileAvatar } from '../../components/profile/Avatar';

import { GenericHeader } from '../../components/custom/headers/index';
import {
  ProfileBio,
  ProfileHandle,
  ProfileImages,
  ProfileName,
} from '../../components/profile/index';
type ConversationInfoProps = MainScreenProps<'ConversationInfo'>;

export const ConversationInfo = ({ route }: ConversationInfoProps) => {
  const { t } = useTranslation();
  const { id } = route.params;
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { data: messages } = openpeepsApi.useConversation(id);

  const participants = messages?.[0]?.audience || [];
  const isGroupChat = participants.length > 2;

  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader title={t('conversations.info')} />
      <ScrollView className="flex-1">
        {isGroupChat ? (
          <>
            <ThemedText className="text-lg font-semibold px-4 py-2">
              {participants.length} people
            </ThemedText>
            {participants.map((participant) => (
              <View
                key={participant.id}
                className="flex-row items-center justify-between px-4 py-5"
              >
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('Profile', {
                      handle: participant.handle,
                    });
                  }}
                >
                  <View className="flex-row items-center gap-x-3">
                    <ProfileAvatar profile={participant} className="size-10" />
                    <View>
                      <ThemedText className="font-medium">
                        {participant.id === currentProfile?.id
                          ? 'You'
                          : participant.displayName}
                      </ThemedText>
                      <ThemedText className="text-muted-foreground">
                        @{participant.handle}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
                {participant.id !== currentProfile?.id && (
                  <FollowUnfollowButton profile={participant} />
                )}
              </View>
            ))}
          </>
        ) : (
          // Direct message layout
          <View className="items-center py-6">
            <ThemedText className="text-sm text-muted-foreground mb-4">
              Conversation with
            </ThemedText>
            {participants.length > 0 && (
              <>
                <ProfileImages profile={participants} />
                <ProfileName profile={participants} />
                <ProfileHandle profile={participants} />
                <ProfileBio profile={participants} />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </ThemedSafeAreaView>
  );
};
