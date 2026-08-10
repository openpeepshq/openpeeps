import React from 'react';
import { Profile, isDeletedProfile } from '@openpeepshq/common';
import { Avatar, AvatarImage } from '~/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { View, Text } from 'react-native';
import { cn, getInitials } from '~/lib/utils';
import { UserXIcon } from '~/components/icons';

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
  const iconSize = isSmall ? 16 : 28;
  const roundedClass = 'rounded-full';
  const deleted = isDeletedProfile(profile);

  const avatarSource =
    !deleted && profile?.avatar
      ? { uri: `${profile.avatar}?cache=${Date.now()}` }
      : null;

  if (deleted || !avatarSource) {
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
          {deleted ? (
            <UserXIcon size={iconSize} className="text-muted-foreground" />
          ) : (
            <Text className={cn('text-foreground font-medium', textSizeClass)}>
              {getInitials(profile)}
            </Text>
          )}
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
        className={cn('h-full w-full', roundedClass)}
        resizeMode="cover"
      />
    </Avatar>
  );
};
