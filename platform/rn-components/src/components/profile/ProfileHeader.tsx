import React from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicProfile } from '@openpeepshq/common/types';
import { truncateText } from '@openpeepshq/common/lib';
import { profileFieldLink } from '@openpeepshq/react';
import { MapPinIcon } from '../icons/index';
import { PostMarkdown } from '../post/Markdown';
import { ThemedText } from '../ui/themed-text';
import { ProfileAvatar } from './Avatar';
import { ProfilePageAction } from './ProfilePageAction';
import { ProfileStats } from './ProfileStats';

export interface ProfileHeaderProps {
  profile: PublicProfile;
  isCurrentProfile?: boolean;
}

export const ProfileHeader = ({
  profile,
  isCurrentProfile = false,
}: ProfileHeaderProps) => {
  const { t } = useTranslation();
  const roles = profile.roles ?? [];
  return (
    <View className="relative mb-8">
      <View className="relative aspect-[3/1] w-full bg-muted">
        <Image
          source={
            profile.header
              ? { uri: profile.header }
              : require('../../assets/images/profile-background-placeholder.png')
          }
          className="h-full w-full"
          resizeMode="cover"
        />
        <View className="absolute -bottom-12 left-4 z-10">
          <ProfileAvatar profile={profile} className="size-24" />
        </View>
      </View>
      <ProfilePageAction
        profile={profile}
        isCurrentProfile={isCurrentProfile}
      />
      <View className="p-2">
        <ThemedText className="mt-4 text-base font-semibold">
          {truncateText(profile.displayName || profile.handle, 50)}
        </ThemedText>
        <ThemedText className="my-1 text-sm text-muted-foreground">
          @{profile.handle}
        </ThemedText>
        {roles.length > 0 ? (
          <View
            className="mt-2 flex-row flex-wrap gap-1"
            accessibilityLabel={t('profile.header.roles')}
          >
            {roles.map((role) => (
              <View key={role.key} className="rounded bg-secondary px-2 py-0.5">
                <ThemedText className="text-xs text-secondary-foreground">
                  {role.displayName || role.key}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
        <PostMarkdown source={profile.bio || t('profile.noBio')} />
        {profile.location?.text ? (
          <View className="flex-row items-center gap-1">
            <MapPinIcon size={12} className="text-foreground" />
            <ThemedText>{profile.location.text}</ThemedText>
          </View>
        ) : null}
        <ProfileStats profile={profile} />
        {(profile.fields ?? []).map((field) => {
          const link = profileFieldLink(field.value);
          return (
            <View
              key={field.name}
              className="mt-4 min-w-0 flex-row items-center gap-2"
            >
              <ThemedText className="shrink-0 text-sm text-muted-foreground">
                {field.name}
              </ThemedText>
              {link ? (
                <Pressable
                  accessibilityRole="link"
                  className="min-w-0 flex-1"
                  onPress={() => void Linking.openURL(link.href)}
                >
                  <ThemedText
                    className="text-sm text-primary"
                    numberOfLines={1}
                  >
                    {link.display}
                  </ThemedText>
                </Pressable>
              ) : (
                <View className="min-w-0 flex-1 pt-1">
                  <PostMarkdown source={field.value} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};
