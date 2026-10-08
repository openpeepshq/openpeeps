import React, { forwardRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { PublicProfile } from '@openpeepshq/common';
import { BaseSheet } from '../custom/modals/common';

import { ProfileHandle, ProfileImages, ProfileName } from './ProfilePieces';
import { useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FollowUnfollowButton } from './';

interface ProfileSheetProps {
  profile: PublicProfile[];
  onConnect?: () => void;
}

export const ProfileSheet = forwardRef<BottomSheetModal, ProfileSheetProps>(
  ({ profile }, ref) => {
    const navigation =
      useNavigation<NativeStackNavigationProp<MainStackParamList>>();

    return (
      <BaseSheet ref={ref}>
        <View className="flex-1">
          <View className="items-center pt-6">
            <TouchableOpacity
              onPress={() => {
                // @ts-ignore
                ref?.current?.close();
                navigation.navigate('Profile', {
                  handle: profile[0].handle,
                });
              }}
            >
              <ProfileImages profile={profile} />
            </TouchableOpacity>
            <ProfileName profile={profile} />
            <ProfileHandle profile={profile} />
            <View className="w-10/12 mt-10">
              <FollowUnfollowButton profile={profile[0]} />
            </View>
          </View>
        </View>
      </BaseSheet>
    );
  }
);
