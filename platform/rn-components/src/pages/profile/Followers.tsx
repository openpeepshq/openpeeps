import React from 'react';
import { useOpenpeeps } from '@openpeepshq/react';
import { MainScreenProps } from '../../components/navigation/types/index';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { EmptyStateContainer } from '../../components/custom/index';
import { useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { ActivityIndicator } from 'react-native';

import { ProfileCard } from '../../components/profile/index';
type ProfileFollowersProps = MainScreenProps<'ProfileFollowers'>;

export const Followers: React.FC<ProfileFollowersProps> = ({ route }) => {
  const { openpeepsApi } = useOpenpeeps();
  const { id } = route.params;

  const { data: profileFollowers, isLoading } =
    openpeepsApi.useProfileFollowers(id);
  const { data: profile, isLoading: isProfileFetching } =
    openpeepsApi.useProfile(id);

  useSetPageHeader(
    `${!isProfileFetching ? `@${profile?.handle}` : ''} Followers`
  );

  return (
    <ThemedView className="flex-1">
      <KeyboardAwareScrollView
        contentContainerClassName="grow"
        className="w-full flex bg-background"
      >
        {isLoading && <ActivityIndicator size={'small'} />}
        {profileFollowers?.map((follower, index) => {
          return <ProfileCard key={index} profile={follower} />;
        })}
        {profileFollowers?.length === 0 && (
          <EmptyStateContainer
            type="followers"
            copyKey="profile.followers.noFollowing"
          />
        )}
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
