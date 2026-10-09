import React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNewResource } from '@openpeepshq/react';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ResourceForm } from '../../components/post/index';

type NewResourceProps = MainScreenProps<'NewResource'>;

export const NewResource: React.FC<NewResourceProps> = () => {
  const { t } = useTranslation();
  const {
    postData,
    setPostData,
    canSubmit,
    submitting,
    error,
    clearError,
    submit,
  } = useNewResource();

  React.useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  useSetPageHeader(
    t('resources.new', { defaultValue: 'New resource' }),
    <HeaderActionButton
      title={
        submitting
          ? t('common.submitting', { defaultValue: 'Submitting…' })
          : t('resources.create.title', { defaultValue: 'Create resource' })
      }
      onPress={() => void submit()}
      disabled={submitting || !canSubmit}
      loading={submitting}
    />
  );

  return (
    <ThemedView className="flex-1">
      <KeyboardAwareScrollView
        contentContainerClassName="grow"
        className="pb-12"
      >
        <ResourceForm postData={postData} onChange={setPostData} />
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
