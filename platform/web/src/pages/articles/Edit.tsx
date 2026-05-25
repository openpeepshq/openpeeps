import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PostCreationData, PostDataUnion } from '@openpeeps/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { ArticleForm } from '@openpeeps/react/components';
import { Button } from '@openpeeps/react-ui';

export function EditArticle() {
  const t = useT();
  const navigate = useNavigate();
  const { articleId = '' } = useParams<{ articleId: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(articleId);
  const updatePost = openpeepsApi.updatePostAction({ id: articleId });

  useSetPageHeader(t('articles.edit', { defaultValue: 'Edit article' }));

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

  if (postQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
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

  const submit = async () => {
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
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <ArticleForm postData={postData} onChange={setPostData} isEdit />

      {error ? (
        <p className="border-error/40 text-error rounded-md border p-2 text-sm">
          {error}
        </p>
      ) : null}

      <Button
        title="Save"
        variant="variant-filled-primary"
        action={submit}
        disabled={submitting}
      >
        {submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('common.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
