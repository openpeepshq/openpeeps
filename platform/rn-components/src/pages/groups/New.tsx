import React from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useCurrentProfile, useNewGroup } from '@openpeepshq/react';
import { GenericHeader } from '../../components/custom/index';
import { GroupForm } from '../../components/groups/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ProfilesInput } from '../../components/profile/index';
import { Label } from '../../components/ui/label';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';

type NewGroupProps = MainScreenProps<'CreateGroup'>;

export const NewGroup: React.FC<NewGroupProps> = () => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const {
    groupData,
    setGroupData,
    members,
    setMembers,
    submitting,
    error,
    clearError,
    fieldErrors,
    submit,
  } = useNewGroup();

  React.useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('groups.new.title', { defaultValue: 'Create group' })}
        rightButtonTitle={
          submitting
            ? t('common.submitting', { defaultValue: 'Creating…' })
            : t('common.submit', { defaultValue: 'Create group' })
        }
        onRightButtonPress={() => void submit()}
        rightButtonDisabled={submitting}
        rightType="button"
      />
      <KeyboardAwareScrollView
        contentContainerClassName="grow"
        className="w-full p-4"
      >
        <View className="gap-y-4 pb-12">
          <GroupForm
            groupData={groupData}
            fieldErrors={fieldErrors}
            onChange={setGroupData}
          />
          <View className="gap-y-2 px-1">
            <Label nativeID="group-members">
              {t('groups.form.members', { defaultValue: 'Members' })}
            </Label>
            <ProfilesInput
              value={members}
              onChange={setMembers}
              banlist={me ? [me] : []}
              placeholder={t('groups.form.membersPlaceholder', {
                defaultValue: 'Add members to this group',
              })}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
