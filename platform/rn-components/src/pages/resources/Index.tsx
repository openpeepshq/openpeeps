import React from 'react';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useCurrentProfile, useDefaultVisibility } from '@openpeepshq/react';
import { useSetPageHeader } from '../../components/layout';
import { NewResourceButton } from '../../components/post/index';
import { ResourceLibrary } from '../../components/resources/index';
import {
  TAB_ROUTES,
  type TabScreenProps,
} from '../../components/navigation/types';
import { ThemedView } from '../../components/ui/themed-view';

export const ResourcesIndex = () => {
  const { t } = useTranslation();
  const currentProfile = useCurrentProfile();
  const visibility = useDefaultVisibility();
  const route =
    useRoute<TabScreenProps<typeof TAB_ROUTES.RESOURCES>['route']>();

  useSetPageHeader(t('navigation.resources', { defaultValue: 'Resources' }));

  return (
    <ThemedView className="relative flex-1">
      <ResourceLibrary categoryPath={route.params?.category} />
      <NewResourceButton
        visibility={visibility}
        currentProfile={currentProfile}
      />
    </ThemedView>
  );
};
