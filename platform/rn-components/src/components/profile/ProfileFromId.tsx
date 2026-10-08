import React from 'react';
import { useOpenpeeps } from '@openpeepshq/react';
import { ActivityIndicator, View } from 'react-native';
import { ProfileAvatar } from './Avatar';
import { Profile } from '@openpeepshq/common';

interface AvatarFromIdProps {
  id?: string;
}

export const ProfileFromId = ({ id }: AvatarFromIdProps) => {
  const { openpeepsApi } = useOpenpeeps();

  const { data: profile, isLoading } = openpeepsApi.useProfile(id || '');
  return (
    <View>
      {isLoading && <ActivityIndicator size={'small'} />}
      {!isLoading && (
        <ProfileAvatar className="ml-2 w-8 h-8" profile={profile as Profile} />
      )}
    </View>
  );
};
