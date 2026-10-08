import { useMemo } from 'react';
import { useT, useSetPageHeader } from '../../index';
import { useNewEvent } from '../../hooks/events/useEventComposer';
import { EventForm } from '../../components';
import { Button, Toast } from '@openpeepshq/react-ui';

export function NewEvent() {
  const t = useT();
  const {
    postData,
    setPostData,
    canSubmit,
    submitting,
    error,
    clearError,
    submit,
  } = useNewEvent();

  const headerActions = useMemo(
    () => (
      <Button
        title={t('events.create.title', { defaultValue: 'Create Event' })}
        variant="default"
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
      <EventForm postData={postData} onChange={setPostData} />

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
