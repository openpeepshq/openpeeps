import {useOpenpeeps} from '@openpeeps/react';
import React from 'react';
import {Image, View} from 'react-native';
import {Avatar, AvatarImage} from '~/components/ui/avatar';

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

  return (
    <View className="w-full p-2 relative  rounded-md h-[250px]">
      <Image
        source={
          headerUri
            ? {uri: headerUri}
            : require('~/assets/images/group-header-placeholder.png')
        }
        className="w-full h-full rounded-md object-bottom"
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
                uri: server?.communityConfig.theme.defaultGroupAvatar,
              }}
            />
          )}
        </Avatar>
      </View>
    </View>
  );
};
