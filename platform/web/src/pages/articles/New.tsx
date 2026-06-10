import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PostCreationData } from '@openpeeps/common/types';
import {
  useT,
  useOpenpeeps,
  defaultNewArticle,
  useSetPageHeader,
} from '@openpeeps/react';
import { ArticleForm, useServerInfo } from '@openpeeps/react/components';
import { Button, Toast } from '@openpeeps/react-ui';

export function NewArticle() {
  const t = useT();
  const navigate = useNavigate();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();

  const [postData, setPostData] = useState<PostCreationData>(() =>
    defaultNewArticle(serverInfo.publicContent),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const article = postData.data.type === 'article' ? postData.data : null;
  const canSubmit =
    !!article?.title?.trim() &&
    !(postData.visibility === 'direct' && !postData.audience?.length);

  const submit = useCallback(async () => {
    setError(null);
    if (!article?.title?.trim()) {
      setError(
        t('articles.validation.titleRequired', {
          defaultValue: 'Title is required',
        }),
      );
      return;
    }
    if (postData.visibility === 'direct' && !postData.audience?.length) {
      setError('Choose at least one recipient for a direct article.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPost({ ...postData, type: 'article' });
      navigate(`/posts/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [article, createPost, navigate, postData, t]);

  const headerActions = useMemo(
    () => (
      <Button
        title={t('articles.create.title', { defaultValue: 'Create article' })}
        variant="variant-filled-primary"
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
          <Toast variant="error" onDismiss={() => setError(null)}>
            {error}
          </Toast>
        </div>
      ) : null}
    </div>
  );
}
