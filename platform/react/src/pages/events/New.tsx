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
    canCreate,
    canSubmit,
    submitting,
    error,
    clearError,
    submit,
  } = useNewEvent();

  const headerActions = useMemo(() => {
    if (!canCreate) return null;
    return (
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
    );
  }, [canCreate, canSubmit, submit, submitting, t]);

  useSetPageHeader(
    t('events.create.title', { defaultValue: 'Create Event' }),
    headerActions,
  );

  if (!canCreate) {
    return (
      <div
        className="mx-auto flex max-w-md flex-col gap-2 px-6 py-16 text-center"
        data-testid="events-create-not-allowed"
        role="status"
      >
        <p className="text-xl font-semibold">
          {t('events.create.notAllowed.title', {
            defaultValue: "You can't create events",
          })}
        </p>
        <p className="text-muted-foreground text-sm">
          {t('events.create.notAllowed.description', {
            defaultValue:
              "Your role isn't allowed to create events. Ask a community owner or moderator if you need to host one.",
          })}
        </p>
      </div>
    );
  }

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
