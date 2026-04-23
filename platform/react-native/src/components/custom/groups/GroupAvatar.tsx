import React from 'react';
import { Group } from '@openpeeps/common';
import { Avatar, AvatarImage } from '~/components/ui/avatar';
import { cn } from '~/lib/utils';
import { useOpenpeeps } from '@openpeeps/react';

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

  const avatarSource = { uri: `${group.avatar || server?.communityConfig.theme.defaultGroupAvatar}?cache=${Date.now()}` };

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
        className={cn(
          'h-full w-full',
          roundedClass
        )}
        resizeMode="cover"
      />
    </Avatar>
  );
};
