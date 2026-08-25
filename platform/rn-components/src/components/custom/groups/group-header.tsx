import {useOpenpeeps} from '@openpeepshq/react';
import React from 'react';
import {Image, View} from 'react-native';
import {Avatar, AvatarImage} from '~/components/ui/avatar';
import {getTheme} from '@openpeepshq/common';

interface GroupHeaderProps {
  headerUri?: string;
  avatarUri?: string;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  headerUri = undefined,
  avatarUri = undefined,
}) => {
  const {openpeepsApi} = useOpenpeeps();
  const {data: server} = openpeepsApi.useServerInfo();
  const defaultGroupAvatar = server
    ? getTheme(server.communityConfig).defaultGroupAvatar
    : undefined;

  return (
    <View className="w-full p-2 relative rounded-md aspect-[3/1] bg-surface">
      <Image
        source={
          headerUri
            ? {uri: headerUri}
            : require('~/assets/images/group-header-placeholder.png')
        }
        className="w-full h-full rounded-md"
        resizeMode="cover"
      />
      <View className="absolute -bottom-10  left-4">
        <Avatar alt="group" className="size-24 mt-4">
          {avatarUri ? (
            <AvatarImage
              source={{
                uri: avatarUri,
              }}
            />
          ) : (
            <AvatarImage
              source={{
                uri: defaultGroupAvatar,
              }}
            />
          )}
        </Avatar>
      </View>
    </View>
  );
};
