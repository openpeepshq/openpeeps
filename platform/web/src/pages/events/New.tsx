import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PostCreationData } from '@openpeeps/common/types';
import {
  useT,
  useOpenpeeps,
  eventSanitizer,
  getNewPostStores,
  useSetPageHeader,
} from '@openpeeps/react';
import { EventForm, useServerInfo } from '@openpeeps/react/components';
import { Button, Toast } from '@openpeeps/react-ui';

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

  const [postData, setPostData] = useState<PostCreationData>(() =>
    sanitize(stores.event),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const event = postData.data.type === 'event' ? postData.data : null;
  const canSubmit =
    !!event?.start &&
    !!event?.name?.trim() &&
    !(postData.visibility === 'direct' && !postData.audience?.length);

  const submit = useCallback(async () => {
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
  }, [createPost, event, navigate, postData, stores, t]);

  const headerActions = useMemo(
    () => (
      <Button
        title={t('events.create.title', { defaultValue: 'Create Event' })}
        variant="variant-filled-primary"
        action={submit}
        disabled={submitting || !canSubmit}
        data-testid="events-create-submit"
      >
        {submitting
          ? t('common.submitting', { defaultValue: 'Creating…' })
          : t('events.create.title', { defaultValue: 'Create Event' })}
      </Button>
    ),
    [canSubmit, submit, submitting, t],
  );

  useSetPageHeader(
    t('events.create.title', { defaultValue: 'Create Event' }),
    headerActions,
  );

  return (
    <div className="pb-12">
      <EventForm
        postData={postData}
        onChange={(data) => {
          setPostData(data);
          stores.event = data;
        }}
      />

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
