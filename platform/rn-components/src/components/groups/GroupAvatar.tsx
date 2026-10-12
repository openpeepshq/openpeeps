import React from 'react';
import { View, Text } from 'react-native';
import { Group, getGroupAvatar } from '@openpeepshq/common';
import {
  useOpenpeeps,
  getInitials,
  hueFromHandle,
  initialsBackground,
} from '@openpeepshq/react';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';
import { Avatar, AvatarImage } from '../ui/avatar';
import { cn } from '../../lib/utils';

export const GroupAvatar = ({
  group,
  className,
}: {
  group: Group;
  className?: string;
}) => {
  const { openpeepsApi } = useOpenpeeps();
  const { isDark } = useOpenPeepsTheme();
  const { data: server } = openpeepsApi.useServerInfo();

  const isSmall = className?.includes('size-8');
  const sizeClass = isSmall ? 'h-8 w-8' : 'h-16 w-16';
  const roundedClass = 'rounded-full';

  const avatarUri =
    server && group
      ? getGroupAvatar(group, server.communityConfig)
      : group?.avatar;

  const hue = hueFromHandle(group?.handle ?? '');
  const backgroundColor = avatarUri
    ? undefined
    : initialsBackground(hue, isDark);

  return (
    <Avatar
      alt={group.displayName || group.handle}
      className={cn(
        'border border-muted-foreground overflow-hidden',
        sizeClass,
        roundedClass,
        className
      )}
    >
      {avatarUri ? (
        <AvatarImage
          source={{ uri: avatarUri }}
          className={cn('h-full w-full', roundedClass)}
          resizeMode="cover"
        />
      ) : (
        <View
          className={cn(
            'flex h-full w-full items-center justify-center',
            roundedClass
          )}
          style={{ backgroundColor }}
        >
          <Text
            className="text-foreground font-medium"
            style={{ fontSize: isSmall ? 14 : 24 }}
          >
            {getInitials(group?.displayName, group?.handle)}
          </Text>
        </View>
      )}
    </Avatar>
  );
};
