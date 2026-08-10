import React, { useEffect } from 'react';
import { PublicProfile } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { Button } from '~/components/ui/button';
import { ThemedText } from '~/components/ui/themed-text';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

interface FollowUnfollowButtonProps {
  profile: PublicProfile;
  useDifferentVariant?: boolean;
}

export const FollowUnfollowButton: React.FC<FollowUnfollowButtonProps> = ({
  profile,
  useDifferentVariant = false,
}) => {
  const { openpeepsApi, queryClient } = useOpenpeeps();
  const followProfile = openpeepsApi.followProfileAction({ id: profile.id });
  const unfollowProfile = openpeepsApi.unfollowProfileAction({ id: profile.id });
  const {
    data: currentProfile,
    isLoading: isProfileLoading,
    refetch: refetchCurrentProfile,
  } = openpeepsApi.useCurrentProfile();
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const isCurrentProfileFollowing = currentProfile?.following
      .map(p => p.id)
      .includes(profile.id);

    setIsFollowing(isCurrentProfileFollowing || false);
  }, [currentProfile, profile]);

  const handleFollowUnfollow = () => {
    if (isFollowing) {
      setIsLoading(true);
      unfollowProfile()
        .then(async response => {
          await refetchCurrentProfile();
          Toast.show({
            type: response.success ? 'success' : 'error',
            text1: response.success ? 'success' : 'error',
            text2: response.success
              ? t('profile.follow.unfollowedSuccess')
              : t('profile.follow.error'),
          });
          await queryClient.invalidateQueries();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(true);
      followProfile({
        reblogs: true,
        notify: true,
      })
        .then(async response => {
          await refetchCurrentProfile();
          Toast.show({
            type: response.success ? 'success' : 'error',
            text1: response.success
              ? t('profile.follow.followedSuccess')
              : t('profile.follow.error'),
            text2: response.success
              ? t('profile.follow.followedSuccess')
              : t('profile.follow.error'),
          });
          await queryClient.invalidateQueries();
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  return (
    <Button
      className="native:h-10 native:p-0 native:px-5"
      disabled={isLoading}
      variant={useDifferentVariant && !isFollowing ? 'secondary' : 'outline'}
      onPress={handleFollowUnfollow}>
      <ThemedText>
        {isLoading || isProfileLoading
          ? t('common.form.loading')
          : isFollowing
            ? t('profile.actions.unfollow')
            : t('profile.follow.follow')}
      </ThemedText>
    </Button>
  );
};
