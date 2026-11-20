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

/** Tailwind spacing unit in dp (size-N / w-N → N × 4). */
const TAILWIND_UNIT = 4;
/** Initials scale with the avatar instead of preset buckets. */
const FONT_RATIO = 0.375;

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

  const roundedClass = 'rounded-full';

  // The requested size (size-N / w-N / h-N) drives the initials font size
  // directly, matching ProfileAvatar: every size renders proportionally
  // scaled fallback content instead of preset buckets, so a group tile and a
  // profile tile of the same size read the same next to each other.
  const sizeMatch = (className ?? '').match(
    /(?:^|\s)(?:size-|w-|h-)(\d+)(?=\s|$)/
  );
  const px = sizeMatch ? Number(sizeMatch[1]) * TAILWIND_UNIT : 64;
  const fontSize = Math.max(10, Math.round(px * FONT_RATIO));
  const sizeClass = sizeMatch ? '' : 'h-16 w-16';

  const avatarUri =
    server && group
      ? getGroupAvatar(group, server.communityConfig)
      : group?.avatar;

  const hue = hueFromHandle(group?.handle ?? '');
  const backgroundColor = initialsBackground(hue, isDark);

  // The initials tile is the underlay behind the image branch (absolutely
  // positioned to fill the avatar box): while the group avatar is still
  // downloading — or permanently, when the media cache cannot produce the
  // file — it is the visible content, and it doubles as the standalone
  // content for no-avatar groups. Either way the slot carries sized,
  // centered content (issue #1666).
  const initialsTile = (
    <View
      className={cn(
        'absolute inset-0 flex items-center justify-center',
        roundedClass
      )}
      style={{ backgroundColor }}
    >
      <Text className="text-foreground font-medium" style={{ fontSize }}>
        {getInitials(group?.displayName, group?.handle)}
      </Text>
    </View>
  );

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
        <>
          {initialsTile}
          <AvatarImage
            source={{ uri: avatarUri }}
            className={cn('h-full w-full', roundedClass)}
            resizeMode="cover"
          />
        </>
      ) : (
        initialsTile
      )}
    </Avatar>
  );
};
