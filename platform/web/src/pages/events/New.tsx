import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PostCreationData } from '@openpeeps/common/types';
import {
  useT,
  useOpenpeeps,
  eventSanitizer,
  getNewPostStores,
  useSetPageHeader,
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
  const stores = getNewPostStores();
  const sanitize = useMemo(
    () => eventSanitizer(serverInfo.publicContent),
    [serverInfo.publicContent],
  );

  useSetPageHeader(t('events.new', { defaultValue: 'New event' }));

  const [postData, setPostData] = useState<PostCreationData>(() =>
    sanitize(stores.event),
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
      stores.resetNewEventState();
      navigate(`/posts/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <EventForm
        postData={postData}
        onChange={(data) => {
          setPostData(data);
          stores.event = data;
        }}
      />

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
        data-testid="events-create-submit"
      >
        {submitting
          ? t('common.submitting', { defaultValue: 'Creating…' })
          : t('events.create.title', { defaultValue: 'Create event' })}
      </Button>
    </div>
  );
}
