import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useEditGroup } from '@openpeepshq/react';
import { GenericHeader } from '~/components/custom';
import { GroupForm } from '~/components/groups';
import { MainScreenProps } from '~/components/navigation/types';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { ThemedText } from '~/components/ui/themed-text';

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

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('groups.edit.info.title', {
          defaultValue: 'Group information',
        })}
        rightButtonTitle={
          submitting
            ? t('common.saving', { defaultValue: 'Saving…' })
            : t('common.save', { defaultValue: 'Save' })
        }
        onRightButtonPress={() => void submit()}
        rightButtonDisabled={submitting || !groupData}
        rightType="button"
      />
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
    </ThemedSafeAreaView>
  );
};
