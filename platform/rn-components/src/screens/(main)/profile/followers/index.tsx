import React from 'react';
import {useOpenpeeps} from '@openpeepshq/react';
import {MainScreenProps} from '~/components/navigation/types';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {
  EmptyStateContainer,
  GenericHeader,
  ProfileCard,
} from '~/components/custom';
import {ActivityIndicator} from 'react-native';
import {ThemedSafeAreaView} from '~/components/ui/themed-safe-area-view';

type ProfileFollowersProps = MainScreenProps<'ProfileFollowers'>;

export const ProfileFollowers: React.FC<ProfileFollowersProps> = ({
  route,
}) => {
  const {openpeepsApi} = useOpenpeeps();
  const {id} = route.params;

  const {data: profileFollowers, isLoading} =
    openpeepsApi.useProfileFollowers(id);
  const {data: profile, isLoading: isProfileFetching} =
    openpeepsApi.useProfile(id);

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={`${!isProfileFetching ? `@${profile?.handle}` : ''} Followers`}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={{flexGrow: 1}}
        className="w-full flex bg-background">
        {isLoading && <ActivityIndicator size={'small'} />}
        {profileFollowers?.map((follower, index) => {
          return <ProfileCard key={index} profile={follower} />;
        })}
        {profileFollowers?.length === 0 && (
          <EmptyStateContainer type="followers" />
        )}
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
