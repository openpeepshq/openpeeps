import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PostDataUnion } from '@openpeeps/common/types';
import { useT, useOpenpeeps, OpenpeepsMarkdown, MentionTextarea } from '@openpeeps/react';
import { Button, Input, Label } from '@openpeeps/react-ui';

export function EditArticle() {
  const t = useT();
  const navigate = useNavigate();
  const { articleId = '' } = useParams<{ articleId: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(articleId);
  const updatePost = openpeepsApi.updatePostAction({ id: articleId });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postQuery.data && postQuery.data.type === 'article') {
      const data = postQuery.data.data as
        | { title?: string; content?: string; image?: string }
        | undefined;
      setTitle(data?.title ?? '');
      setContent(data?.content ?? '');
      setImage(data?.image ?? '');
    }
  }, [postQuery.data]);

  if (postQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }
  if (!postQuery.data) {
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
      const data: PostDataUnion = {
        ...((postQuery.data.data as object) ?? {}),
        type: 'article',
        title,
        content,
        image: image || undefined,
      } as PostDataUnion;
      await updatePost(data);
      navigate(`/posts/${articleId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <h1 className="text-2xl font-semibold">
        {t('articles.edit', { defaultValue: 'Edit article' })}
      </h1>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Cover image URL</Label>
        <Input
          id="image"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content (markdown)</Label>
        <MentionTextarea
          rows={20}
          value={content}
          onChange={setContent}
        />
        {content ? (
          <div className="border-t pt-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
              {t('posts.form.preview', { defaultValue: 'Preview' })}
            </p>
            <OpenpeepsMarkdown source={content} linkPreviewMode="none" />
          </div>
        ) : null}
      </div>

      {error && (
        <p className="border-error/40 text-error rounded-md border p-2 text-sm">
          {error}
        </p>
      )}

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
