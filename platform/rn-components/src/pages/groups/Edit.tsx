import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { checkGroupCapabilities } from '@openpeepshq/common';
import { useAuthData, useOpenpeeps } from '@openpeepshq/react';
import { ConfigMenuButton } from '../../components/configuration/index';
import { useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ThemedText } from '../../components/ui/themed-text';

type EditGroupProps = MainScreenProps<'EditGroupDetails'>;

export const EditGroup = ({ route, navigation }: EditGroupProps) => {
  const { handle } = route.params;
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const authData = useAuthData();
  const groupQuery = openpeepsApi.useGroupByHandle(handle);

  const group = groupQuery.data;
  const canEdit =
    !!group &&
    checkGroupCapabilities(authData, ['core-groups-update'], group).success;
  const canEditCapabilities =
    !!group &&
    checkGroupCapabilities(authData, ['core-groups-updateCapabilities'], group)
      .success;

  useSetPageHeader(t('groups.edit.title', { defaultValue: 'Edit group' }));

  return (
    <ThemedView className="flex-1">
      {groupQuery.isLoading ? (
        <ActivityIndicator size="small" />
      ) : !group ? (
        <ThemedText className="p-8 text-center text-2xl">
          {t('groups.notFound', { defaultValue: 'Group not found' })}
        </ThemedText>
      ) : (
        <View className="p-4">
          {canEdit ? (
            <ConfigMenuButton
              translationPrefix="groups.edit.info"
              onPress={() => navigation.navigate('EditGroupInfo', { handle })}
            />
          ) : null}
          {canEditCapabilities ? (
            <ConfigMenuButton
              translationPrefix="groups.edit.roles"
              onPress={() => navigation.navigate('EditGroupRoles', { handle })}
            />
          ) : null}
        </View>
      )}
    </ThemedView>
  );
};
