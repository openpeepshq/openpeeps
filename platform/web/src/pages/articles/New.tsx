import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PostCreationData } from '@openpeeps/common/types';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { useDefaultVisibility } from '@openpeeps/react/components';
import { Button, Input, Label, Textarea } from '@openpeeps/react-ui';

export function NewArticle() {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const visibility = useDefaultVisibility();
  const createPost = openpeepsApi.createPostAction();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!title.trim()) {
      setError(
        t('articles.validation.titleRequired', {
          defaultValue: 'Title is required',
        }),
      );
      return;
    }
    setSubmitting(true);
    try {
      const data: PostCreationData = {
        visibility,
        type: 'article',
        data: {
          type: 'article',
          title,
          content,
          image: image || undefined,
        },
      };
      const post = (await createPost(data)) as { id: string };
      navigate(`/posts/${post.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <h1 className="text-2xl font-semibold">
        {t('articles.new', { defaultValue: 'New article' })}
      </h1>

      <div className="space-y-2">
        <Label htmlFor="title">
          {t('articles.form.title', { defaultValue: 'Title' })}
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">
          {t('articles.form.image', { defaultValue: 'Cover image URL' })}
        </Label>
        <Input
          id="image"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">
          {t('articles.form.content', {
            defaultValue: 'Article content (markdown)',
          })}
        </Label>
        <Textarea
          id="content"
          rows={20}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {error && (
        <p className="border-error/40 text-error rounded-md border p-2 text-sm">
          {error}
        </p>
      )}

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
