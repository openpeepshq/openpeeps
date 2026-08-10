import { Profile } from '@openpeepshq/common';
import React from 'react';
import { Image, View } from 'react-native';
import { ProfileAvatar } from './profile-avatar';

interface ProfileProps {
  profile?: Profile;
}

export const ProfileHeader: React.FC<ProfileProps> = ({ profile }) => {

  return (
    <View className="w-full p-2 relative rounded-md aspect-[3/1] bg-muted">
      <Image
        source={
          profile?.header
            ? { uri: profile?.header }
            : require('~/assets/images/profile-background-placeholder.png')
        }
        className="w-full h-full rounded-md"
        resizeMode="cover"
      />
      <View className="absolute z-10 -bottom-10  left-4">
        <ProfileAvatar profile={profile as Profile} className="size-24 mt-4"/>
      </View>
    </View>
  );
};
