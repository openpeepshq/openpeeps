import React from 'react';
import { ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { truncateText } from '@openpeepshq/common/lib';
import { useEditResource } from '@openpeepshq/react';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ResourceForm } from '../../components/post/index';
import { ThemedText } from '../../components/ui/themed-text';

type EditResourceProps = MainScreenProps<'EditResource'>;

export const EditResource: React.FC<EditResourceProps> = ({ route }) => {
  const { id } = route.params;
  const { t } = useTranslation();
  const {
    postQuery,
    postData,
    setPostData,
    resourceTitle,
    canSubmit,
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

  useSetPageHeader(
    title,
    <HeaderActionButton
      title={
        submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('resources.update.title', { defaultValue: 'Update resource' })
      }
      onPress={() => void submit()}
      disabled={submitting || !canSubmit}
      loading={submitting}
    />
  );

  return (
    <ThemedView className="flex-1">
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
    </ThemedView>
  );
};
