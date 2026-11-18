import React, { useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  const navigation =
    useNavigation<TabScreenProps<typeof TAB_ROUTES.RESOURCES>['navigation']>();
  const route =
    useRoute<TabScreenProps<typeof TAB_ROUTES.RESOURCES>['route']>();

  // Mirror the folder into the route params (the web URL write-back's
  // counterpart): a later `navigate` to this tab with the same folder then
  // sees changed params, so the seed re-applies instead of being a no-op.
  const onCategoryChange = useCallback(
    (path: string[]) => {
      navigation.setParams({
        category: path.length ? [...path] : undefined,
      });
    },
    [navigation]
  );

  useSetPageHeader(t('navigation.resources', { defaultValue: 'Resources' }));

  return (
    <ThemedView className="relative flex-1">
      <ResourceLibrary
        categoryPath={route.params?.category}
        onCategoryChange={onCategoryChange}
      />
      <NewResourceButton
        visibility={visibility}
        currentProfile={currentProfile}
      />
    </ThemedView>
  );
};
