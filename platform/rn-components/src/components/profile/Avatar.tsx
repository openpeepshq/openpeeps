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

/** Tailwind spacing unit in dp (size-N / w-N → N × 4). */
const TAILWIND_UNIT = 4;
/** Initials and deleted-icon scale with the avatar instead of preset buckets. */
const FONT_RATIO = 0.375;
const ICON_RATIO = 0.4375;

const avatarPxFromClassName = (className?: string): number => {
  const match = className?.match(/(?:^|\s)(?:size-|w-)(\d+)(?=\s|$)/);
  return match ? Number(match[1]) * TAILWIND_UNIT : 64;
};

export const ProfileAvatar = ({
  profile,
  className,
}: {
  profile: Profile;
  className?: string;
}) => {
  const { t } = useTranslation();
  const { isDark } = useOpenPeepsTheme();

  const px = avatarPxFromClassName(className);
  const iconSize = Math.max(12, Math.round(px * ICON_RATIO));
  const fontSize = Math.max(10, Math.round(px * FONT_RATIO));
  const roundedClass = 'rounded-full';
  const deleted = isDeletedProfile(profile);

  const avatarSource =
    !deleted && profile?.avatar ? { uri: svgCoverSrc(profile.avatar) } : null;

  const hue = hueFromHandle(profile?.handle ?? '');
  const backgroundColor =
    !deleted && !avatarSource ? initialsBackground(hue, isDark) : undefined;

  const rootClassName = cn(
    'border border-muted-foreground overflow-hidden',
    roundedClass,
    className
  );

  if (deleted || !avatarSource) {
    return (
      <Avatar
        alt={t('profile.header.avatarAlt')}
        className={rootClassName}
        style={{ width: px, height: px }}
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
            <Text className="text-foreground font-medium" style={{ fontSize }}>
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
      className={rootClassName}
      style={{ width: px, height: px }}
    >
      <AvatarImage
        source={avatarSource}
        className={cn('h-full w-full', roundedClass)}
        resizeMode="cover"
      />
    </Avatar>
  );
};
