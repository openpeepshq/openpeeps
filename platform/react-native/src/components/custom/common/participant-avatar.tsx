import React from 'react';
import {useOpenpeeps} from '@openpeeps/react';
import {Avatar, AvatarImage} from '../../ui/avatar';

interface ParticipantAvatarProps {
  profileId: string;
}

export const ParticipantAvatar = ({profileId}: ParticipantAvatarProps) => {
  const {openpeepsApi} = useOpenpeeps();
  const {data: profile, isLoading} = openpeepsApi.useProfile(profileId);
  const {data: server} = openpeepsApi.useServerInfo();

  return (
    <React.Fragment>
      {!isLoading && profile && (
        <Avatar
          alt={profile?.displayName || profile?.handle}
          className="w-8 h-8">
          {profile?.avatar ? (
            <AvatarImage
              source={{
                uri: profile?.avatar,
              }}
            />
          ) : (
            <AvatarImage
              source={{
                uri: server?.communityConfig.theme.defaultProfileAvatar,
              }}
            />
          )}
        </Avatar>
      )}
    </React.Fragment>
  );
};
