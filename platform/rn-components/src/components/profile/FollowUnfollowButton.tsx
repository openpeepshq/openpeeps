import React from 'react';
import { PublicProfile } from '@openpeepshq/common';
import { useFollowProfile, useOpenpeeps } from '@openpeepshq/react';
import { Button } from '../ui/button';
import { ThemedText } from '../ui/themed-text';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export interface FollowUnfollowButtonProps {
  profile: PublicProfile;
  compact?: boolean;
  onSuccess?: () => void;
}

export const FollowUnfollowButton = ({
  profile,
  compact = false,
  onSuccess,
}: FollowUnfollowButtonProps) => {
  const { queryClient } = useOpenpeeps();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(false);
  const { isSelf, isFollowing, follow, unfollow } = useFollowProfile(
    profile,
    () => {
      void queryClient.invalidateQueries();
      onSuccess?.();
    }
  );

  if (isSelf) return null;

  const handleFollowUnfollow = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollow();
        Toast.show({
          type: 'success',
          text1: t('profile.follow.unfollowedSuccess'),
        });
      } else {
        await follow();
        Toast.show({
          type: 'success',
          text1: t('profile.follow.followedSuccess'),
        });
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: t('profile.follow.error'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className={cn(
        'native:p-0',
        compact ? 'native:h-8 native:px-3' : 'native:h-10 native:px-5'
      )}
      disabled={isLoading}
      variant={isFollowing ? 'outline' : 'default'}
      onPress={handleFollowUnfollow}
    >
      <ThemedText
        className={isFollowing ? undefined : 'text-primary-foreground'}
      >
        {isLoading
          ? t('common.form.loading')
          : isFollowing
            ? t('profile.actions.unfollow')
            : t('profile.actions.follow')}
      </ThemedText>
    </Button>
  );
};
