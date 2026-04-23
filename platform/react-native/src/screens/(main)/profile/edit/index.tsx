import React from 'react';
import { MainScreenProps } from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeeps/react';
import { GenericHeader, EditProfileForm } from '~/components/custom';

import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';

type EditProfileProps = MainScreenProps<'EditProfile'>;

export const EditProfile: React.FC<EditProfileProps> = () => {
  const { currentProfile } = useOpenpeeps();

  return (
    <ThemedSafeAreaView style={{ flex: 1 }}>
      <GenericHeader title="Edit Profile" />
      <EditProfileForm handle={currentProfile?.handle as string} />
    </ThemedSafeAreaView>
  );
};
