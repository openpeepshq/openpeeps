import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text } from 'react-native';
import { Profile, isDeletedProfile } from '@openpeepshq/common';
import {
  getInitials,
  hueFromHandle,
  initialsBackground,
  svgCoverSrc,
} from '@openpeepshq/react';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';
import { Avatar, AvatarImage } from '../ui/avatar';
import { UserXIcon } from '../icons/index';
import { cn } from '../../lib/utils';

export const ProfileAvatar = ({
  profile,
  className,
}: {
  profile: Profile;
  className?: string;
}) => {
  const { t } = useTranslation();
  const { isDark } = useOpenPeepsTheme();

  const isSmall = className?.includes('size-8');
  const sizeClass = isSmall ? 'h-8 w-8' : 'h-16 w-16';
  const iconSize = isSmall ? 16 : 28;
  const roundedClass = 'rounded-full';
  const deleted = isDeletedProfile(profile);

  const avatarSource =
    !deleted && profile?.avatar ? { uri: svgCoverSrc(profile.avatar) } : null;

  const hue = hueFromHandle(profile?.handle ?? '');
  const backgroundColor =
    !deleted && !avatarSource ? initialsBackground(hue, isDark) : undefined;

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
            'flex h-full w-full items-center justify-center',
            roundedClass
          )}
          style={{ backgroundColor }}
        >
          {deleted ? (
            <UserXIcon size={iconSize} className="text-muted-foreground" />
          ) : (
            <Text
              className="text-foreground font-medium"
              style={{ fontSize: isSmall ? 14 : 24 }}
            >
              {getInitials(profile?.displayName, profile?.handle)}
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
