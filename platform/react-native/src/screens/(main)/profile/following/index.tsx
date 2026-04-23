import React from 'react';
import {useOpenpeeps} from '@openpeeps/react';
import {MainScreenProps} from '../../../../components/navigation/types';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {
  EmptyStateContainer,
  GenericHeader,
  ProfileCard,
} from '../../../../components/custom';
import {ActivityIndicator} from 'react-native';
import {ThemedSafeAreaView} from '../../../../components/ui/themed-safe-area-view';

type ProfileFollowingProps = MainScreenProps<'ProfileFollowing'>;

export const ProfileFollowing: React.FC<ProfileFollowingProps> = ({
  route,
}) => {
  const {openpeepsApi} = useOpenpeeps();
  const {id} = route.params;

  const {data: profileFollowing, isLoading} =
    openpeepsApi.useProfileFollowing(id);
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
        {profileFollowing?.map((following, index) => {
          return <ProfileCard key={index} profile={following} />;
        })}
        {profileFollowing?.length === 0 && (
          <EmptyStateContainer type="following" />
        )}
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
