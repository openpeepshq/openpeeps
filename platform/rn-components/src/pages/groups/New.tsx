import React from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useCurrentProfile, useNewGroup } from '@openpeepshq/react';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { GroupForm } from '../../components/groups/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ProfilesInput } from '../../components/profile/index';
import { Label } from '../../components/ui/label';

type NewGroupProps = MainScreenProps<'CreateGroup'>;

export const NewGroup: React.FC<NewGroupProps> = ({ navigation }) => {
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
    canCreate,
    submit,
  } = useNewGroup();

  React.useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  React.useEffect(() => {
    if (me && !canCreate) {
      navigation.navigate('TabNavigator', { screen: 'Groups' });
    }
  }, [canCreate, me, navigation]);

  useSetPageHeader(
    canCreate
      ? t('groups.new.title', { defaultValue: 'Create group' })
      : undefined,
    canCreate ? (
      <HeaderActionButton
        title={
          submitting
            ? t('common.submitting', { defaultValue: 'Creating…' })
            : t('common.submit', { defaultValue: 'Create group' })
        }
        onPress={() => void submit()}
        disabled={submitting}
        loading={submitting}
      />
    ) : undefined
  );

  if (!canCreate) return null;

  return (
    <ThemedView className="flex-1">
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
    </ThemedView>
  );
};
