import React from 'react';
import {useOpenpeeps} from '@openpeeps/react';
import {ActivityIndicator, View} from 'react-native';
import {ProfileAvatar} from '../profile/profile-avatar';
import {Profile} from '@openpeeps/common';

interface AvatarFromIdProps {
  id?: string;
}

export const AvatarFromId = ({id}: AvatarFromIdProps) => {
  const {openpeepsApi} = useOpenpeeps();

  const {data: profile, isLoading} = openpeepsApi.useProfile(id || '');
  return (
    <View>
      {isLoading && <ActivityIndicator size={'small'} />}
      {!isLoading && (
        <ProfileAvatar className="ml-2 w-8 h-8" profile={profile as Profile} />
      )}
    </View>
  );
};
