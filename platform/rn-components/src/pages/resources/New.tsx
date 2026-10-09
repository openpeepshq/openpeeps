import React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNewResource } from '@openpeepshq/react';
import { GenericHeader } from '~/components/custom';
import { MainScreenProps } from '~/components/navigation/types';
import { ResourceForm } from '~/components/post';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';

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

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('resources.new')}
        rightButtonTitle={
          submitting ? t('common.submitting') : t('resources.create.title')
        }
        onRightButtonPress={() => void submit()}
        rightButtonDisabled={submitting || !canSubmit}
        rightType="button"
      />
      <KeyboardAwareScrollView
        contentContainerClassName="grow"
        className="pb-12"
      >
        <ResourceForm postData={postData} onChange={setPostData} />
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
