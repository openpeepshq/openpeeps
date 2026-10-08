import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicProfile } from '@openpeepshq/common';
import { profileName } from '@openpeepshq/common/lib';
import { XIcon } from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';
import { cn } from '~/lib/utils';
import { ProfileAvatar } from './Avatar';

export type ProfileBadgeProps = {
  profile: PublicProfile;
  onRemove?: () => void;
  className?: string;
};

export const ProfileBadge = ({
  profile,
  onRemove,
  className,
}: ProfileBadgeProps) => {
  const { t } = useTranslation();

  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 rounded-md border border-secondary bg-background px-2 py-1',
        className
      )}
    >
      <ProfileAvatar profile={profile} className="size-8" />
      <ThemedText
        className="max-w-40 text-sm font-medium text-primary"
        numberOfLines={1}
      >
        {profileName(profile)}
      </ThemedText>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.selector.remove', {
            defaultValue: 'Remove',
          })}
          className="ml-0.5 rounded-full p-0.5"
          onPress={onRemove}
        >
          <XIcon size={12} className="text-primary" />
        </Pressable>
      ) : null}
    </View>
  );
};
