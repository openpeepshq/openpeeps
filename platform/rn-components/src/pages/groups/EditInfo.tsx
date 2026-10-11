import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useEditGroup } from '@openpeepshq/react';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { GroupForm } from '../../components/groups/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ThemedText } from '../../components/ui/themed-text';

type EditGroupInfoProps = MainScreenProps<'EditGroupInfo'>;

export const EditGroupInfo = ({ route }: EditGroupInfoProps) => {
  const { handle } = route.params;
  const { t } = useTranslation();
  const {
    groupQuery,
    groupData,
    setGroupData,
    submitting,
    error,
    clearError,
    fieldErrors,
    submit,
  } = useEditGroup(handle, { section: 'info' });

  React.useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  useSetPageHeader(
    t('groups.edit.info.title', {
      defaultValue: 'Group information',
    }),
    <HeaderActionButton
      title={
        submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('common.save', { defaultValue: 'Save' })
      }
      onPress={() => void submit()}
      disabled={submitting || !groupData}
      loading={submitting}
    />
  );

  return (
    <ThemedView className="flex-1">
      {groupQuery.isLoading || !groupData ? (
        groupQuery.isLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <ThemedText className="p-8 text-center text-2xl">
            {t('groups.notFound', { defaultValue: 'Group not found' })}
          </ThemedText>
        )
      ) : (
        <KeyboardAwareScrollView
          contentContainerClassName="grow"
          className="w-full p-4"
        >
          <View className="pb-12">
            <GroupForm
              groupData={groupData}
              fieldErrors={fieldErrors}
              isEdit
              sections={['info']}
              onChange={setGroupData}
            />
          </View>
        </KeyboardAwareScrollView>
      )}
    </ThemedView>
  );
};
