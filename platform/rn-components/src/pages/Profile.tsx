import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCurrentProfile, useOpenpeeps } from '@openpeepshq/react';
import { GenericHeader } from '../components/custom/index';
import { RssIcon } from '../components/icons/index';
import { MainScreenProps } from '../components/navigation/types/index';
import {
  ProfileHeader,
  ProfilePostsAndReplies,
} from '../components/profile/index';
import { ThemedSafeAreaView } from '../components/ui/themed-safe-area-view';
import { ThemedText } from '../components/ui/themed-text';

type ProfileProps = MainScreenProps<'Profile'>;

export const Profile = ({ route }: ProfileProps) => {
  const { t } = useTranslation();
  const { handle } = route.params;
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const profileQuery = openpeepsApi.useProfileByHandle(handle);
  const isOwnProfile = me?.handle === handle;
  const profile = isOwnProfile ? me : (profileQuery.data ?? undefined);
  const blockedByMe = !isOwnProfile && !!profileQuery.data?.blockedByMe;

  const notFound = (
    <View className="relative flex-col items-center pt-20">
      <RssIcon size={60} className="text-foreground" />
      <ThemedText className="mt-2 text-lg font-medium">
        {t('profile.notFound.title')}
      </ThemedText>
      <ThemedText className="mt-2 text-sm text-muted-foreground">
        {t('profile.notFound.description')}
      </ThemedText>
    </View>
  );

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader title={profile?.displayName || `@${handle}`} />
      {profileQuery.isLoading && !profile ? (
        <ActivityIndicator size="small" />
      ) : profile ? (
        blockedByMe ? (
          <View>
            <ProfileHeader profile={profile} isCurrentProfile={false} />
            <View className="flex-col items-center px-4 pb-8">
              <ThemedText className="text-lg font-medium">
                {t('profile.block.blockedTitle')}
              </ThemedText>
              <ThemedText className="mt-2 text-center text-sm text-muted-foreground">
                {t('profile.block.blockedDescription', {
                  handle: profile.handle,
                })}
              </ThemedText>
            </View>
          </View>
        ) : (
          <ProfilePostsAndReplies
            profile={profile}
            isCurrentProfile={isOwnProfile}
            header={
              <ProfileHeader
                profile={profile}
                isCurrentProfile={isOwnProfile}
              />
            }
          />
        )
      ) : (
        notFound
      )}
    </ThemedSafeAreaView>
  );
};
