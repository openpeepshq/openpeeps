import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PostDataUnion } from '@openpeeps/common/types';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { Button, Input, Label, Textarea } from '@openpeeps/react-ui';

function dateToInputValue(value: string | undefined, wholeDay: boolean) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  if (wholeDay) return d.toISOString().slice(0, 10);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function EditEvent() {
  const t = useT();
  const navigate = useNavigate();
  const { eventId = '' } = useParams<{ eventId: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(eventId);
  const updatePost = openpeepsApi.updatePostAction();

  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [wholeDay, setWholeDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postQuery.data && postQuery.data.type === 'event') {
      const data = postQuery.data.data as {
        name?: string;
        content?: string;
        image?: string;
        url?: string;
        start?: string;
        end?: string;
        wholeDay?: boolean;
      };
      setName(data.name ?? '');
      setContent(data.content ?? '');
      setImage(data.image ?? '');
      setUrl(data.url ?? '');
      setWholeDay(data.wholeDay ?? false);
      setStart(dateToInputValue(data.start, data.wholeDay ?? false));
      setEnd(dateToInputValue(data.end, data.wholeDay ?? false));
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
        {t('events.notFound', { defaultValue: 'Event not found' })}
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    const startIso = toIso(start);
    if (!startIso) {
      setError(
        t('events.validation.startRequired', {
          defaultValue: 'Start date is required',
        }),
      );
      return;
    }
    setSubmitting(true);
    try {
      const data: PostDataUnion = {
        ...((postQuery.data!.data as object) ?? {}),
        type: 'event',
        name,
        content,
        image: image || undefined,
        url: url || undefined,
        start: startIso,
        end: toIso(end),
        wholeDay,
      } as PostDataUnion;
      await updatePost(data, { id: eventId });
      navigate(`/posts/${eventId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <h1 className="text-2xl font-semibold">
        {t('events.edit', { defaultValue: 'Edit event' })}
      </h1>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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

      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start">Start</Label>
          <Input
            id="start"
            type={wholeDay ? 'date' : 'datetime-local'}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">End</Label>
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
        <span>Whole day</span>
      </label>

      <div className="space-y-2">
        <Label htmlFor="url">Event URL</Label>
        <Input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Description (markdown)</Label>
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
