import React from 'react';
import { Profile } from '@openpeeps/common';
import { Avatar, AvatarImage } from '../../ui/avatar';
import { useTranslation } from 'react-i18next';
import { View, Text } from 'react-native';
import { cn, getInitials } from '../../../lib/utils';

export const ProfileAvatar = ({
  profile,
  className,
}: {
  profile: Profile;
  className?: string;
}) => {
  const { t } = useTranslation();

  const isSmall = className?.includes('size-8');
  const sizeClass = isSmall ? 'h-8 w-8' : 'h-16 w-16';
  const textSizeClass = isSmall ? 'text-[14px]' : 'text-[24px]';
  const roundedClass = 'rounded-full';

  const avatarSource = profile?.avatar
    ? { uri: `${profile.avatar}?cache=${Date.now()}` }
    : null;

  if (!avatarSource) {
    const initials = getInitials(profile);
    return (
      <Avatar
        alt={t('profile.header.avatarAlt')}
        className={cn(
          'border border-muted-foreground overflow-hidden',
          sizeClass,
          roundedClass,
          className
        )}
      >
        <View
          className={cn(
            'flex h-full w-full items-center justify-center bg-background',
            roundedClass
          )}
        >
          <Text
            className={cn(
              'text-foreground font-medium',
              textSizeClass
            )}
          >
            {initials}
          </Text>
        </View>
      </Avatar>
    );
  }

  return (
    <Avatar
      alt={t('profile.header.avatarAlt')}
      className={cn(
        'border border-muted-foreground overflow-hidden',
        sizeClass,
        roundedClass,
        className
      )}
    >
      <AvatarImage
        source={avatarSource}
        className={cn(
          'h-full w-full',
          roundedClass
        )}
        resizeMode="cover"
      />
    </Avatar>
  );
};
