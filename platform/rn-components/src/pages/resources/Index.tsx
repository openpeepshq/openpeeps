import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentProfile, useDefaultVisibility } from '@openpeepshq/react';
import { useSetPageHeader } from '../../components/layout';
import { NewResourceButton } from '../../components/post/index';
import { ResourceLibrary } from '../../components/resources/index';
import { ThemedView } from '../../components/ui/themed-view';

export const ResourcesIndex = () => {
  const { t } = useTranslation();
  const currentProfile = useCurrentProfile();
  const visibility = useDefaultVisibility();

  useSetPageHeader(t('navigation.resources', { defaultValue: 'Resources' }));

  return (
    <ThemedView className="relative flex-1">
      <ResourceLibrary />
      <NewResourceButton
        visibility={visibility}
        currentProfile={currentProfile}
      />
    </ThemedView>
  );
};
