import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Event,
  PostCreationData,
  PostDataUnion,
} from '@openpeepshq/common/types';
import {
  effectiveEventTimes,
  normalizeEventDataForSave,
  upsertEventException,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useNavigate } from '../../contexts/router';
import { useT } from '../../i18n/context';
import { useServerInfo } from '../../components/server-data/context';
import { eventSanitizer, getNewPostStores } from '../../stores/newPosts';

export const useNewEvent = () => {
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

  const [postData, setPostDataState] = useState<PostCreationData>(() =>
    sanitize(stores.event),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const event = postData.data.type === 'event' ? postData.data : null;
  const canSubmit =
    !!event?.start &&
    !!event?.name?.trim() &&
    !(postData.visibility === 'direct' && !postData.audience?.length);

  const setPostData = (data: PostCreationData) => {
    setPostDataState(data);
    stores.event = data;
  };

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
      const created = await createPost({
        ...postData,
        type: 'event',
        data: normalizeEventDataForSave(event),
      });
      stores.resetNewEventState();
      navigate({ type: 'post', id: created.id });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [createPost, event, navigate, postData, stores, t]);

  return {
    postData,
    setPostData,
    canSubmit,
    submitting,
    error,
    clearError: () => setError(null),
    submit,
  };
};

export const useEditEvent = (eventId: string, occurrence?: string) => {
  const t = useT();
  const navigate = useNavigate();
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
  }, [loadedEventId, occurrence, postQuery.data]);

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
      // Editing one occurrence of a series stores an exception instead of rewriting the series.
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
      navigate({
        type: 'post',
        id: eventId,
        occurrence,
      });
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

  return {
    postQuery,
    postData,
    setPostData,
    event,
    eventName,
    canSubmit: !!event?.start,
    submitting,
    error,
    clearError: () => setError(null),
    submit,
  };
};
