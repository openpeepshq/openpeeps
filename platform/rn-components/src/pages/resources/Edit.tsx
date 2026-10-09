import React from 'react';
import { ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { truncateText } from '@openpeepshq/common/lib';
import { useEditResource } from '@openpeepshq/react';
import { GenericHeader } from '~/components/custom';
import { MainScreenProps } from '~/components/navigation/types';
import { ResourceForm } from '~/components/post';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { ThemedText } from '~/components/ui/themed-text';

type EditResourceProps = MainScreenProps<'EditResource'>;

export const EditResource: React.FC<EditResourceProps> = ({ route }) => {
  const { id } = route.params;
  const { t } = useTranslation();
  const {
    postQuery,
    postData,
    setPostData,
    resourceTitle,
    submitting,
    error,
    clearError,
    submit,
  } = useEditResource(id);

  React.useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  const title = resourceTitle
    ? `${t('resources.edit')} ${truncateText(resourceTitle)}`
    : t('resources.edit');

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={title}
        rightButtonTitle={
          submitting ? t('common.saving') : t('resources.update.title')
        }
        onRightButtonPress={() => void submit()}
        rightButtonDisabled={submitting || !postData}
        rightType="button"
      />
      {postQuery.isLoading ? (
        <ActivityIndicator size="small" />
      ) : !postQuery.data || !postData ? (
        <ThemedText className="p-8 text-center text-2xl">
          {t('resources.notFound')}
        </ThemedText>
      ) : (
        <KeyboardAwareScrollView
          contentContainerClassName="grow"
          className="pb-12"
        >
          <ResourceForm postData={postData} onChange={setPostData} isEdit />
        </KeyboardAwareScrollView>
      )}
    </ThemedSafeAreaView>
  );
};
