import React from 'react';
import { MainScreenProps } from '../../components/navigation/types/index';
import { useOpenpeeps } from '@openpeepshq/react';
import { GenericHeader } from '../../components/custom/index';

import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';

import { EditProfileForm } from '../../components/profile/index';
type EditProfileProps = MainScreenProps<'EditProfile'>;

export const PublicProfileSettings: React.FC<EditProfileProps> = () => {
  const { currentProfile } = useOpenpeeps();

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader title="Edit Profile" />
      <EditProfileForm handle={currentProfile?.handle as string} />
    </ThemedSafeAreaView>
  );
};
