import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PostCreationData } from '@openpeeps/common/types';
import {
  useT,
  useOpenpeeps,
  defaultNewArticle,
  useSetPageHeader,
} from '@openpeeps/react';
import { ArticleForm, useServerInfo } from '@openpeeps/react/components';
import { Button } from '@openpeeps/react-ui';

export function NewArticle() {
  const t = useT();
  const navigate = useNavigate();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();

  useSetPageHeader(t('articles.new', { defaultValue: 'New article' }));

  const [postData, setPostData] = useState<PostCreationData>(() =>
    defaultNewArticle(serverInfo.publicContent),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const article = postData.data.type === 'article' ? postData.data : null;

  const submit = async () => {
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
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <ArticleForm postData={postData} onChange={setPostData} />

      {error ? (
        <p className="border-error/40 text-error rounded-md border p-2 text-sm">
          {error}
        </p>
      ) : null}

      <Button
        title="Publish"
        variant="variant-filled-primary"
        action={submit}
        disabled={submitting}
      >
        {submitting
          ? t('common.submitting', { defaultValue: 'Publishing…' })
          : t('articles.publish', { defaultValue: 'Publish article' })}
      </Button>
    </div>
  );
}
