import React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNewArticle } from '@openpeepshq/react';
import { GenericHeader } from '~/components/custom';
import { MainScreenProps } from '~/components/navigation/types';
import { ArticleForm } from '~/components/post';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';

type NewArticleProps = MainScreenProps<'NewArticle'>;

export const NewArticle: React.FC<NewArticleProps> = () => {
  const { t } = useTranslation();
  const {
    postData,
    setPostData,
    canSubmit,
    submitting,
    error,
    clearError,
    submit,
  } = useNewArticle();

  React.useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('articles.new', { defaultValue: 'New article' })}
        rightButtonTitle={
          submitting
            ? t('common.submitting', { defaultValue: 'Publishing…' })
            : t('articles.create.title', { defaultValue: 'Create article' })
        }
        onRightButtonPress={() => void submit()}
        rightButtonDisabled={submitting || !canSubmit}
        rightType="button"
      />
      <KeyboardAwareScrollView
        contentContainerClassName="grow"
        className="pb-12"
      >
        <ArticleForm postData={postData} onChange={setPostData} />
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
