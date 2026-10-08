import type { PublicPost } from '@openpeepshq/common/types';
import { useT } from '../../../i18n';
import { Button } from '@openpeepshq/react-ui';
import { useEventRsvp } from '../../../hooks/events/useEventRsvp';
import { EventRsvpScopeDialog } from './EventRsvpScopeDialog';

export interface EventRsvpButtonProps {
  post: PublicPost;
  recurrenceId?: string;
  lockToOccurrence?: boolean;
}

export const EventRsvpButton = ({
  post,
  recurrenceId,
  lockToOccurrence = false,
}: EventRsvpButtonProps) => {
  const t = useT();
  const {
    profile,
    myEvent,
    myRsvp,
    canRsvp,
    recurring,
    defaultId,
    occurrences,
    capacityEvent,
    full,
    error,
    pending,
    setPending,
    submitting,
    requestRespond,
    confirmScope,
  } = useEventRsvp({ post, recurrenceId, lockToOccurrence });

  if (myEvent || !profile) return null;
  if (!canRsvp && !(myRsvp && myRsvp.response !== 'no')) return null;

  if (myRsvp?.response === 'removed') {
    return (
      <p className="text-muted-foreground mt-4 text-center text-sm">
        {t('events.rsvp.removedMessage', {
          defaultValue: 'The organizer has removed you from this event.',
        })}
      </p>
    );
  }

  const scopeDialog =
    pending && recurring && !lockToOccurrence ? (
      <EventRsvpScopeDialog
        open
        post={post}
        response={pending}
        defaultRecurrenceId={defaultId}
        occurrences={occurrences}
        error={error}
        submitting={submitting}
        onClose={() => {
          if (!submitting) setPending(null);
        }}
        onConfirm={async (scope) => {
          await confirmScope(scope);
        }}
      />
    ) : null;

  if (myRsvp && myRsvp.response !== 'no') {
    return (
      <div className="w-full">
        <Button
          variant="outline"
          className="text-error w-full"
          disabled={submitting}
          action={() => requestRespond('no')}
        >
          {t('posts.rsvp.cancelRegistration', {
            defaultValue: 'Cancel registration',
          })}
        </Button>
        <p className="mt-2 text-center text-sm">
          {myRsvp.response === 'yes'
            ? t('posts.rsvp.attendingMessage', {
                defaultValue: 'You are attending.',
              })
            : t('posts.rsvp.maybeMessage', {
                defaultValue: 'You responded maybe.',
              })}
        </p>
        {error && !pending ? (
          <p className="text-error mt-2 text-center text-sm">{error}</p>
        ) : null}
        {scopeDialog}
      </div>
    );
  }

  return (
    <div className="mt-4 w-full">
      <div className="flex w-full gap-x-2">
        <Button
          variant="default"
          className="w-[70%]"
          disabled={full || submitting}
          action={() => requestRespond('yes')}
        >
          {full
            ? t('events.rsvp.full', { defaultValue: 'Event is full' })
            : t('posts.rsvp.register', { defaultValue: 'Register' })}
        </Button>
        {!capacityEvent ? (
          <Button
            variant="ghost"
            disabled={submitting}
            action={() => requestRespond('tentative')}
          >
            {t('posts.rsvp.maybe', { defaultValue: 'Maybe' })}
          </Button>
        ) : null}
        <Button
          variant="outline"
          disabled={submitting}
          action={() => requestRespond('no')}
        >
          {t('posts.rsvp.no', { defaultValue: 'No' })}
        </Button>
      </div>
      {error && !pending ? (
        <p className="text-error mt-2 text-center text-sm">{error}</p>
      ) : null}
      {scopeDialog}
    </div>
  );
};
