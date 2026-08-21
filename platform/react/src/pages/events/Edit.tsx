import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type {
  Event,
  PostCreationData,
  PostDataUnion,
} from '@openpeepshq/common/types';
import {
  effectiveEventTimes,
  normalizeEventDataForSave,
  parseOccurrenceQuery,
  truncateText,
  upsertEventException,
} from '@openpeepshq/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { EventForm } from '../../components';
import { Button, LoadingSpinner, Toast } from '@openpeepshq/react-ui';

export function EditEvent() {
  const t = useT();
  const navigate = useNavigate();
  const { eventId = '' } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const occurrence = parseOccurrenceQuery(searchParams.get('occurrence'));
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(eventId);
  const updatePost = openpeepsApi.updatePostAction({ id: eventId });

  const [postData, setPostData] = useState<PostCreationData | null>(null);
  const [loadedEventId, setLoadedEventId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      postQuery.data?.type === 'event' &&
      postQuery.data.id !== loadedEventId
    ) {
      const series = postQuery.data.data as PostDataUnion & { type: 'event' };
      const times = occurrence
        ? effectiveEventTimes(series, occurrence)
        : { start: series.start, end: series.end };
      setPostData({
        visibility: postQuery.data.visibility,
        type: 'event',
        groupId: postQuery.data.groupId ?? undefined,
        audience: postQuery.data.audience ?? undefined,
        data: {
          ...series,
          start: times.start,
          end: times.end,
        },
      });
      setLoadedEventId(postQuery.data.id);
    }
  }, [loadedEventId, postQuery.data]);

  const event = postData?.data.type === 'event' ? postData.data : null;
  const eventName = (postQuery.data?.data as Event | undefined)?.name;

  const submit = useCallback(async () => {
    if (!postData || !event) return;
    setError(null);
    if (!event.start) {
      setError(
        t('events.validation.startRequired', {
          defaultValue: 'Start date is required',
        }),
      );
      return;
    }
    setSubmitting(true);
    try {
      const series = postQuery.data?.data as Event | undefined;
      if (!series) return;
      const toSave =
        occurrence && series.recurrence
          ? upsertEventException(series, {
              recurrenceId: occurrence,
              start: event.start,
              end: event.end,
              physicalLocation: event.physicalLocation,
            })
          : event;
      await updatePost(normalizeEventDataForSave(toSave) as PostDataUnion);
      navigate(
        occurrence
          ? `/posts/${eventId}?occurrence=${encodeURIComponent(occurrence)}`
          : `/posts/${eventId}`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [
    event,
    eventId,
    navigate,
    occurrence,
    postData,
    postQuery.data,
    t,
    updatePost,
  ]);

  const headerActions = useMemo(
    () => (
      <Button
        title={t('events.update.title', { defaultValue: 'Update event' })}
        variant="default"
        action={submit}
        disabled={submitting || !event?.start}
      >
        {submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('events.update.title', { defaultValue: 'Update event' })}
      </Button>
    ),
    [event?.start, submit, submitting, t],
  );

  useSetPageHeader(
    eventName
      ? `${t('events.edit', { defaultValue: 'Edit event' })} ${truncateText(eventName)}`
      : t('events.edit', { defaultValue: 'Edit event' }),
    headerActions,
  );

  if (postQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
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

  return (
    <div className="pb-12">
      <EventForm
        postData={postData}
        onChange={setPostData}
        isEdit
        occurrenceEdit={!!occurrence}
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
