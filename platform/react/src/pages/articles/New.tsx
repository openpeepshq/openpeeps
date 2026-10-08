import { useMemo } from 'react';
import { useT, useSetPageHeader } from '../../index';
import { ArticleForm } from '../../components';
import { useNewArticle } from '../../hooks';
import { Button, Toast } from '@openpeepshq/react-ui';

export function NewArticle() {
  const t = useT();
  const {
    postData,
    setPostData,
    canSubmit,
    submitting,
    error,
    clearError,
    submit,
  } = useNewArticle();

  const headerActions = useMemo(
    () => (
      <Button
        title={t('articles.create.title', { defaultValue: 'Create article' })}
        variant="default"
        action={submit}
        disabled={submitting || !canSubmit}
      >
        {submitting
          ? t('common.submitting', { defaultValue: 'Publishing…' })
          : t('articles.create.title', { defaultValue: 'Create article' })}
      </Button>
    ),
    [canSubmit, submit, submitting, t],
  );

  useSetPageHeader(
    t('articles.new', { defaultValue: 'New article' }),
    headerActions,
  );

  return (
    <div className="pb-12">
      <ArticleForm postData={postData} onChange={setPostData} />

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
