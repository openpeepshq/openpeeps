import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentProfile, useDefaultVisibility } from '@openpeepshq/react';
import { TabScreensHeader } from '~/components/custom';
import { NewResourceButton } from '~/components/post';
import { ResourceLibrary } from '~/components/resources';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';

export const ResourcesIndex = () => {
  const { t } = useTranslation();
  const currentProfile = useCurrentProfile();
  const visibility = useDefaultVisibility();
  return (
    <ThemedView className="relative flex-1">
      <TabScreensHeader
        children={
          <ThemedText className="text-xl font-bold">
            {t('navigation.resources')}
          </ThemedText>
        }
      />
      <ResourceLibrary />
      <NewResourceButton
        visibility={visibility}
        currentProfile={currentProfile}
      />
    </ThemedView>
  );
};
