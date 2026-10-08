import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { parseOccurrenceQuery, truncateText } from '@openpeepshq/common/lib';
import { useT, useSetPageHeader } from '../../index';
import { useEditEvent } from '../../hooks/events/useEventComposer';
import { EventForm } from '../../components';
import { Button, LoadingSpinner, Toast } from '@openpeepshq/react-ui';

export function EditEvent() {
  const t = useT();
  const { eventId = '' } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const occurrence = parseOccurrenceQuery(searchParams.get('occurrence'));
  const {
    postQuery,
    postData,
    setPostData,
    eventName,
    canSubmit,
    submitting,
    error,
    clearError,
    submit,
  } = useEditEvent(eventId, occurrence);

  const headerActions = useMemo(
    () => (
      <Button
        title={t('events.update.title', { defaultValue: 'Update event' })}
        variant="default"
        action={submit}
        disabled={submitting || !canSubmit}
      >
        {submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('events.update.title', { defaultValue: 'Update event' })}
      </Button>
    ),
    [canSubmit, submit, submitting, t],
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
          <Toast variant="error" onDismiss={clearError}>
            {error}
          </Toast>
        </div>
      ) : null}
    </div>
  );
}
