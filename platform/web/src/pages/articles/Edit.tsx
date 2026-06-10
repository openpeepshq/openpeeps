import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  Article,
  PostCreationData,
  PostDataUnion,
} from '@openpeeps/common/types';
import { truncateText } from '@openpeeps/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { ArticleForm } from '@openpeeps/react/components';
import { Button, Toast } from '@openpeeps/react-ui';

export function EditArticle() {
  const t = useT();
  const navigate = useNavigate();
  const { articleId = '' } = useParams<{ articleId: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(articleId);
  const updatePost = openpeepsApi.updatePostAction({ id: articleId });

  const [postData, setPostData] = useState<PostCreationData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postQuery.data && postQuery.data.type === 'article') {
      setPostData({
        visibility: postQuery.data.visibility,
        type: 'article',
        groupId: postQuery.data.groupId ?? undefined,
        audience: postQuery.data.audience ?? undefined,
        data: postQuery.data.data as PostDataUnion & { type: 'article' },
      });
    }
  }, [postQuery.data]);

  const articleTitle = (postQuery.data?.data as Article | undefined)?.title;

  const submit = useCallback(async () => {
    if (!postData) return;
    setError(null);
    setSubmitting(true);
    try {
      const article = postData.data.type === 'article' ? postData.data : null;
      await updatePost(article as PostDataUnion);
      navigate(`/posts/${articleId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [articleId, navigate, postData, updatePost]);

  const headerActions = useMemo(
    () => (
      <Button
        title={t('articles.update.title', { defaultValue: 'Update article' })}
        variant="variant-filled-primary"
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
        {t('common.loading', { defaultValue: 'Loading…' })}
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
          <Toast variant="error" onDismiss={() => setError(null)}>
            {error}
          </Toast>
        </div>
      ) : null}
    </div>
  );
}
