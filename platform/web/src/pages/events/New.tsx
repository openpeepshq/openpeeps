import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PostCreationData } from '@openpeeps/common/types';
import {
  useT,
  useOpenpeeps,
  defaultNewEvent,
} from '@openpeeps/react';
import {
  EventForm,
  useServerInfo,
} from '@openpeeps/react/components';
import { Button } from '@openpeeps/react-ui';

export function NewEvent() {
  const t = useT();
  const navigate = useNavigate();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();

  const [postData, setPostData] = useState<PostCreationData>(() =>
    defaultNewEvent(serverInfo.publicContent),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const event = postData.data.type === 'event' ? postData.data : null;

  const submit = async () => {
    setError(null);
    if (!event?.start) {
      setError(
        t('events.validation.startRequired', {
          defaultValue: 'Start date is required',
        }),
      );
      return;
    }
    if (!event.name?.trim()) {
      setError(
        t('events.validation.nameRequired', {
          defaultValue: 'Event name is required',
        }),
      );
      return;
    }
    if (postData.visibility === 'direct' && !postData.audience?.length) {
      setError('Choose at least one recipient for a direct event.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPost({ ...postData, type: 'event' });
      navigate(`/posts/${created.id}`);
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

      <EventForm postData={postData} onChange={setPostData} />

      {error ? (
        <p className="border-error/40 text-error rounded-md border p-2 text-sm">
          {error}
        </p>
      ) : null}

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
