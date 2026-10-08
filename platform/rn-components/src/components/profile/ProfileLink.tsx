import React, { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PublicProfile } from '@openpeepshq/common';
import { isDeletedProfile } from '@openpeepshq/common';
import { MainStackParamList } from '~/components/navigation/types';

export interface ProfileLinkProps {
  profile?: PublicProfile;
  className?: string;
  children: ReactNode;
}

/** Opens the profile screen unless the profile is soft-deleted. */
export const ProfileLink = ({
  profile,
  className,
  children,
}: ProfileLinkProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  if (!profile || isDeletedProfile(profile)) {
    return <View className={className}>{children}</View>;
  }
  return (
    <Pressable
      className={className}
      onPress={() => navigation.navigate('Profile', { handle: profile.handle })}
    >
      {children}
    </Pressable>
  );
};
