import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { truncateText } from '@openpeepshq/common/lib';
import { useT, useSetPageHeader } from '../../index';
import { ArticleForm } from '../../components';
import { useEditArticle } from '../../hooks';
import { Button, LoadingSpinner, Toast } from '@openpeepshq/react-ui';

export function EditArticle() {
  const t = useT();
  const { articleId = '' } = useParams<{ articleId: string }>();
  const {
    postQuery,
    postData,
    setPostData,
    articleTitle,
    submitting,
    error,
    clearError,
    submit,
  } = useEditArticle(articleId);

  const headerActions = useMemo(
    () => (
      <Button
        title={t('articles.update.title', { defaultValue: 'Update article' })}
        variant="default"
        action={submit}
        disabled={submitting}
      >
        {submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('articles.update.title', { defaultValue: 'Update article' })}
      </Button>
    ),
    [submit, submitting, t],
  );

  useSetPageHeader(
    articleTitle
      ? `${t('articles.edit', { defaultValue: 'Edit article' })} ${truncateText(articleTitle)}`
      : t('articles.edit', { defaultValue: 'Edit article' }),
    headerActions,
  );

  if (postQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }
  if (!postQuery.data || !postData) {
    return (
      <div className="p-8 text-center text-2xl">
        {t('articles.notFound', { defaultValue: 'Article not found' })}
      </div>
    );
  }

  return (
    <div className="pb-12">
      <ArticleForm postData={postData} onChange={setPostData} isEdit />

      {error ? (
        <div className="px-3">
          <Toast variant="error" onDismiss={clearError}>
            {error}
          </Toast>
        </div>
      ) : null}
    </div>
  );
}
