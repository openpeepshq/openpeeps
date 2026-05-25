import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PostCreationData, PostDataUnion } from '@openpeeps/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { EventForm } from '@openpeeps/react/components';
import { Button } from '@openpeeps/react-ui';

export function EditEvent() {
  const t = useT();
  const navigate = useNavigate();
  const { eventId = '' } = useParams<{ eventId: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(eventId);
  const updatePost = openpeepsApi.updatePostAction({ id: eventId });

  useSetPageHeader(t('events.edit', { defaultValue: 'Edit event' }));

  const [postData, setPostData] = useState<PostCreationData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postQuery.data && postQuery.data.type === 'event') {
      setPostData({
        visibility: postQuery.data.visibility,
        type: 'event',
        groupId: postQuery.data.groupId ?? undefined,
        audience: postQuery.data.audience ?? undefined,
        data: postQuery.data.data as PostDataUnion & { type: 'event' },
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
        {t('events.notFound', { defaultValue: 'Event not found' })}
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    const event = postData.data.type === 'event' ? postData.data : null;
    if (!event?.start) {
      setError(
        t('events.validation.startRequired', {
          defaultValue: 'Start date is required',
        }),
      );
      return;
    }
    setSubmitting(true);
    try {
      await updatePost(event as PostDataUnion);
      navigate(`/posts/${eventId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <EventForm postData={postData} onChange={setPostData} isEdit />

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
