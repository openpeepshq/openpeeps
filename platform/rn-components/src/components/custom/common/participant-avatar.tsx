import React from 'react';
import {useOpenpeeps} from '@openpeepshq/react';
import {Avatar, AvatarImage} from '~/components/ui/avatar';
import {getProfileAvatar} from '@openpeepshq/common';

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
          <AvatarImage
            source={{
              uri: server
                ? getProfileAvatar(profile, server.communityConfig)
                : profile.avatar,
            }}
          />
        </Avatar>
      )}
    </React.Fragment>
  );
};
