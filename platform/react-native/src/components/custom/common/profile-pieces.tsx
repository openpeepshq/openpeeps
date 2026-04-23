import React from 'react';
import { Profile } from '@openpeeps/common';
import { truncateText } from '../../../lib/utils';
import { useOpenpeeps } from '@openpeeps/react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '../../ui/themed-text';
import { Avatar, AvatarImage } from '../../ui/avatar';
import { useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {ProfileAvatar} from '../profile';

interface ProfileProps {
  profile: Profile[];
  defaultTitle?: string;
  avatarSize?: number;
}

export const ProfileName = ({ profile, defaultTitle }: ProfileProps) => {
  const { currentProfile } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const otherProfiles = profile.filter(
    (p) => p.id !== currentProfile?.id,
  );

  if (!profile.length) {
    return <ThemedText>{defaultTitle}</ThemedText>;
  }

  return (
    <>
      {otherProfiles.length === 1 ? (
        <Pressable
          onPress={() =>
            navigation.navigate('Profile', { handle: otherProfiles[0].handle })
          }>
          <ThemedText className="font-semibold">
            {truncateText(otherProfiles[0].displayName, 20)}
          </ThemedText>
        </Pressable>
      ) : (
        <ThemedText className="font-semibold">
          {truncateText(
            profile.map(p => p.displayName || `@${p.handle}`).join(', '),
            20,
          )}
        </ThemedText>
      )}
    </>
  );
};

export const ProfileBio = ({ profile, defaultTitle }: ProfileProps) => {
  const { currentProfile } = useOpenpeeps();

  const otherProfiles = profile.filter(
    (p) => p.id !== currentProfile?.id,
  );

  if (!profile.length) {
    return <ThemedText>{defaultTitle}</ThemedText>;
  }

  return (
    <ThemedText className="">
      {truncateText(
        otherProfiles.length === 1
          ? otherProfiles[0].bio
          : profile.map(p => p.bio).join(', '),
        20,
      )}
    </ThemedText>
  );
};

export const ProfileHandle = ({ profile, defaultTitle }: ProfileProps) => {
  const { currentProfile } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const otherProfiles = profile.filter(
    (p) => p.id !== currentProfile?.id,
  );

  if (!profile.length) {
    return <ThemedText>{defaultTitle}</ThemedText>;
  }

  return (
    <>
      {otherProfiles.length === 1 ? (
        <Pressable
          onPress={() =>
            navigation.navigate('Profile', { handle: otherProfiles[0].handle })
          }>
          <ThemedText className="text-muted-foreground">
            {truncateText(`@${otherProfiles[0].handle}`, 20)}
          </ThemedText>
        </Pressable>
      ) : (
        <ThemedText className="text-muted-foreground">
          {truncateText(profile.map(p => `@${p.handle}`).join(', '), 20)}
        </ThemedText>
      )}
    </>
  );
};

export const ProfileImages = ({ profile, avatarSize }: ProfileProps) => {
  const { currentProfile, openpeepsApi } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const { data: server } = openpeepsApi.useServerInfo();

  const otherProfiles = profile.filter(
    (p) => p.id !== currentProfile?.id,
  );

  const bigAvatarSize = avatarSize || 56;

  const getAvatarSize = () => {
    const participantCount = otherProfiles.length;
    const minSize = 16;
    const maxSize = 32;
    return Math.max(
      minSize,
      Math.min(maxSize, bigAvatarSize / (Math.sqrt(participantCount) + 1)),
    );
  };

  return (
    <View className="py-4">
      {otherProfiles.length === 1 ? (
        <Pressable
          onPress={() =>
            navigation.navigate('Profile', { handle: otherProfiles[0].handle })
          }>
          <ProfileAvatar profile={otherProfiles[0]} />
        </Pressable>
      ) : (
        <View
          style={{
            width: bigAvatarSize,
            height: bigAvatarSize,
            borderRadius: bigAvatarSize / 2,
          }}
          className="border border-border flex-row flex-wrap items-center justify-center content-center gap-0.5 overflow-hidden relative">
          {otherProfiles.map(participant => {
            return (
              <Pressable
                key={participant.id}
                onPress={() =>
                  navigation.navigate('Profile', {
                    handle: participant.handle,
                  })
                }>
                <Avatar
                  key={participant.id}
                  className="border-2 border-input "
                  style={{
                    width: getAvatarSize(),
                    height: getAvatarSize(),
                  }}
                  alt="">
                  {participant.avatar ? (
                    <AvatarImage source={{ uri: participant.avatar }} />
                  ) : (
                    <AvatarImage
                      source={{
                        uri: server?.communityConfig.theme.defaultProfileAvatar,
                      }}
                    />
                  )}
                </Avatar>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};
