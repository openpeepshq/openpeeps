import React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useEditGroup } from '@openpeepshq/react';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { GroupForm } from '../../components/groups/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ThemedText } from '../../components/ui/themed-text';

type EditGroupRolesProps = MainScreenProps<'EditGroupRoles'>;

export const EditGroupRoles = ({ route }: EditGroupRolesProps) => {
  const { handle } = route.params;
  const { t } = useTranslation();
  const {
    groupQuery,
    groupData,
    setGroupData,
    submitting,
    error,
    clearError,
    canEditCapabilities,
    submit,
  } = useEditGroup(handle, { section: 'roles' });

  React.useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  const body = () => {
    if (groupQuery.isLoading) return <ActivityIndicator size="small" />;
    if (!groupQuery.data || !groupData) {
      return (
        <ThemedText className="p-8 text-center text-2xl">
          {t('groups.notFound', { defaultValue: 'Group not found' })}
        </ThemedText>
      );
    }
    if (!canEditCapabilities) {
      return (
        <ThemedText className="p-8 text-center text-sm">
          {t('groups.edit.rolesForbidden', {
            defaultValue:
              'You do not have permission to edit roles and capabilities.',
          })}
        </ThemedText>
      );
    }
    return (
      <ScrollView contentContainerClassName="p-4 pb-12">
        <View className="gap-y-4">
          <GroupForm
            groupData={groupData}
            isEdit
            sections={['roles']}
            onChange={setGroupData}
          />
        </View>
      </ScrollView>
    );
  };

  useSetPageHeader(
    t('groups.edit.roles.title', {
      defaultValue: 'Roles & capabilities',
    }),
    <HeaderActionButton
      title={
        submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('common.save', { defaultValue: 'Save' })
      }
      onPress={() => void submit()}
      disabled={submitting || !groupData || !canEditCapabilities}
      loading={submitting}
    />
  );

  return <ThemedView className="flex-1">{body()}</ThemedView>;
};
