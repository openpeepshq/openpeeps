import React from 'react';
import { ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { truncateText } from '@openpeepshq/common/lib';
import { useEditArticle } from '@openpeepshq/react';
import { GenericHeader } from '../../components/custom/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ArticleForm } from '../../components/post/index';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';
import { ThemedText } from '../../components/ui/themed-text';

type EditArticleProps = MainScreenProps<'EditArticle'>;

export const EditArticle: React.FC<EditArticleProps> = ({ route }) => {
  const { id } = route.params;
  const { t } = useTranslation();
  const {
    postQuery,
    postData,
    setPostData,
    articleTitle,
    submitting,
    error,
    clearError,
    submit,
  } = useEditArticle(id);

  React.useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  const title = articleTitle
    ? `${t('articles.edit', { defaultValue: 'Edit article' })} ${truncateText(articleTitle)}`
    : t('articles.edit', { defaultValue: 'Edit article' });

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={title}
        rightButtonTitle={
          submitting
            ? t('common.saving', { defaultValue: 'Saving…' })
            : t('articles.update.title', { defaultValue: 'Update article' })
        }
        onRightButtonPress={() => void submit()}
        rightButtonDisabled={submitting || !postData}
        rightType="button"
      />
      {postQuery.isLoading ? (
        <ActivityIndicator size="small" />
      ) : !postQuery.data || !postData ? (
        <ThemedText className="p-8 text-center text-2xl">
          {t('articles.notFound', { defaultValue: 'Article not found' })}
        </ThemedText>
      ) : (
        <KeyboardAwareScrollView
          contentContainerClassName="grow"
          className="pb-12"
        >
          <ArticleForm postData={postData} onChange={setPostData} isEdit />
        </KeyboardAwareScrollView>
      )}
    </ThemedSafeAreaView>
  );
};
