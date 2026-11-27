import React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNewArticle } from '@openpeepshq/react';
import { useSetPageHeader } from '../../components/layout';
import { Button } from '../../components/ui/button';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ArticleForm } from '../../components/post/index';

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
    notify,
    setNotify,
    showNotify,
    submit,
  } = useNewArticle();

  React.useEffect(() => {
    if (!error) return;
    Toast.show({ type: 'error', text1: error });
    clearError();
  }, [error, clearError]);

  // Direct messages can't be drafts (error.draftNotDirect). A derived
  // boolean keeps `headerActions` referentially stable — raw `postData` in
  // the deps would re-fire useSetPageHeader on every keystroke.
  const isDirect = postData.visibility === 'direct';

  const headerActions = React.useMemo(
    () => (
      <>
        <Button
          variant="ghost"
          className="mr-1"
          testID="articles-save-draft"
          onPress={() => submit(true)}
          disabled={submitting || !canSubmit || isDirect}
        >
          <ThemedText>
            {t('posts.create.saveDraft', { defaultValue: 'Save draft' })}
          </ThemedText>
        </Button>
        <Button onPress={() => submit()} disabled={submitting || !canSubmit}>
          <ThemedText className="text-primary-foreground font-semibold">
            {submitting
              ? t('common.submitting', { defaultValue: 'Publishing…' })
              : t('articles.create.title', { defaultValue: 'Create article' })}
          </ThemedText>
        </Button>
      </>
    ),
    [canSubmit, submit, submitting, isDirect, t]
  );

  useSetPageHeader(
    t('articles.new', { defaultValue: 'New article' }),
    headerActions
  );

  return (
    <ThemedView className="flex-1">
      <KeyboardAwareScrollView
        contentContainerClassName="grow"
        className="pb-12"
      >
        <ArticleForm
          postData={postData}
          onChange={setPostData}
          showNotify={showNotify}
          notify={notify}
          onNotifyChange={setNotify}
        />
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
