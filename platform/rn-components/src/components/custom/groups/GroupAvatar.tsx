import React from 'react';
import { getGroupAvatar, type Group } from '@openpeepshq/common';
import { Avatar, AvatarImage } from '~/components/ui/avatar';
import { cn } from '~/lib/utils';
import { useOpenpeeps } from '@openpeepshq/react';

export const GroupAvatar = ({
  group,
  className,
}: {
  group: Group;
  className?: string;
}) => {
  const { openpeepsApi } = useOpenpeeps();
  const { data: server } = openpeepsApi.useServerInfo();

  const isSmall = className?.includes('size-8');
  const sizeClass = isSmall ? 'h-8 w-8' : 'h-16 w-16';
  const roundedClass = 'rounded-full';

  const avatarSource = {
    uri: server
      ? getGroupAvatar(group, server.communityConfig)
      : group.avatar,
  };

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
      <AvatarImage
        source={avatarSource}
        className={cn('h-full w-full', roundedClass)}
        resizeMode="cover"
      />
    </Avatar>
  );
};
