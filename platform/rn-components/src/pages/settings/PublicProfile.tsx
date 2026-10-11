import React from 'react';
import { MainScreenProps } from '../../components/navigation/types/index';
import { useOpenpeeps } from '@openpeepshq/react';
import { useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';

import { EditProfileForm } from '../../components/profile/index';
type EditProfileProps = MainScreenProps<'EditProfile'>;

export const PublicProfileSettings: React.FC<EditProfileProps> = () => {
  const { currentProfile } = useOpenpeeps();

  useSetPageHeader('Edit Profile');

  return (
    <ThemedView className="flex-1">
      <EditProfileForm handle={currentProfile?.handle as string} />
    </ThemedView>
  );
};
