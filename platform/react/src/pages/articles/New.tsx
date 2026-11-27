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
    notify,
    setNotify,
    showNotify,
    submit,
  } = useNewArticle();

  // Direct messages can't be drafts (error.draftNotDirect). A derived
  // boolean keeps `headerActions` stable — raw `postData` in the deps would
  // re-fire useSetPageHeader on every keystroke.
  const isDirect = postData?.visibility === 'direct';

  const headerActions = useMemo(
    () => (
      <>
        <Button
          title={t('posts.create.saveDraft', { defaultValue: 'Save draft' })}
          variant="ghost"
          action={() => submit(true)}
          disabled={submitting || !canSubmit || isDirect}
          data-testid="articles-save-draft"
        >
          {t('posts.create.saveDraft', { defaultValue: 'Save draft' })}
        </Button>
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
      </>
    ),
    [canSubmit, submit, submitting, isDirect, t],
  );

  useSetPageHeader(
    t('articles.new', { defaultValue: 'New article' }),
    headerActions,
  );

  return (
    <div className="pb-12">
      <ArticleForm
        postData={postData}
        onChange={setPostData}
        showNotify={showNotify}
        notify={notify}
        onNotifyChange={setNotify}
      />

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
