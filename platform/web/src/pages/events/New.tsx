import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PostCreationData } from '@openpeeps/common/types';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { useDefaultVisibility } from '@openpeeps/react/components';
import { Button, Input, Label, Textarea } from '@openpeeps/react-ui';

function toIsoOrUndefined(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function NewEvent() {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const visibility = useDefaultVisibility();
  const createPost = openpeepsApi.createPostAction();

  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [wholeDay, setWholeDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const startIso = toIsoOrUndefined(start);
    if (!startIso) {
      setError(
        t('events.validation.startRequired', {
          defaultValue: 'Start date is required',
        }),
      );
      return;
    }
    if (!name.trim()) {
      setError(
        t('events.validation.nameRequired', {
          defaultValue: 'Event name is required',
        }),
      );
      return;
    }
    setSubmitting(true);
    try {
      const data: PostCreationData = {
        visibility,
        type: 'event',
        data: {
          type: 'event',
          name,
          content,
          image: image || undefined,
          url: url || undefined,
          start: startIso,
          end: toIsoOrUndefined(end),
          wholeDay,
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
        {t('events.new', { defaultValue: 'New event' })}
      </h1>

      <div className="space-y-2">
        <Label htmlFor="name">
          {t('events.form.name', { defaultValue: 'Event name' })}
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">
          {t('events.form.image', { defaultValue: 'Cover image URL' })}
        </Label>
        <Input
          id="image"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start">
            {t('events.form.start', { defaultValue: 'Start' })}
          </Label>
          <Input
            id="start"
            type={wholeDay ? 'date' : 'datetime-local'}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">
            {t('events.form.end', { defaultValue: 'End (optional)' })}
          </Label>
          <Input
            id="end"
            type={wholeDay ? 'date' : 'datetime-local'}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={wholeDay}
          onChange={(e) => setWholeDay(e.target.checked)}
          className="h-4 w-4"
        />
        <span>
          {t('events.form.wholeDay', { defaultValue: 'Whole day' })}
        </span>
      </label>

      <div className="space-y-2">
        <Label htmlFor="url">
          {t('events.form.url', { defaultValue: 'Event URL' })}
        </Label>
        <Input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">
          {t('events.form.content', { defaultValue: 'Description (markdown)' })}
        </Label>
        <Textarea
          id="content"
          rows={10}
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
        title="Create event"
        variant="variant-filled-primary"
        action={submit}
        disabled={submitting}
      >
        {submitting
          ? t('common.submitting', { defaultValue: 'Creating…' })
          : t('events.create', { defaultValue: 'Create event' })}
      </Button>
    </div>
  );
}
