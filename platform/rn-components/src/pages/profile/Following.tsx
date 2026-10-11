import React from 'react';
import { useOpenpeeps } from '@openpeepshq/react';
import { MainScreenProps } from '../../components/navigation/types/index';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { EmptyStateContainer } from '../../components/custom/index';
import { useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { ActivityIndicator } from 'react-native';

import { ProfileCard } from '../../components/profile/index';
type ProfileFollowingProps = MainScreenProps<'ProfileFollowing'>;

export const Following: React.FC<ProfileFollowingProps> = ({ route }) => {
  const { openpeepsApi } = useOpenpeeps();
  const { id } = route.params;

  const { data: profileFollowing, isLoading } =
    openpeepsApi.useProfileFollowing(id);
  const { data: profile, isLoading: isProfileFetching } =
    openpeepsApi.useProfile(id);
  useSetPageHeader(
    `${!isProfileFetching ? `@${profile?.handle}` : ''} Following`
  );

  return (
    <ThemedView className="flex-1">
      <KeyboardAwareScrollView
        contentContainerClassName="grow"
        className="w-full flex bg-background"
      >
        {isLoading && <ActivityIndicator size={'small'} />}
        {profileFollowing?.map((following, index) => {
          return <ProfileCard key={index} profile={following} />;
        })}
        {profileFollowing?.length === 0 && (
          <EmptyStateContainer
            type="following"
            copyKey="profile.following.noFollowers"
          />
        )}
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
