import type { PublicPost } from '@openpeepshq/common/types';
import { useT } from '../../../i18n';
import { Button } from '@openpeepshq/react-ui';
import { useEventRsvp } from '../../../hooks/events/useEventRsvp';
import { EventRsvpScopeDialog } from './EventRsvpScopeDialog';
import { EventWaitlistJoinDialog } from './EventWaitlistJoinDialog';

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
    rsvpClosed,
    hideRsvpButton,
    recurring,
    defaultId,
    occurrences,
    capacityEvent,
    full,
    onWaitlist,
    offerExpiresAt,
    error,
    pending,
    setPending,
    confirmingWaitlist,
    setConfirmingWaitlist,
    submitting,
    requestRespond,
    requestJoinWaitlist,
    confirmJoinWaitlist,
    claimSpot,
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

  if (rsvpClosed) {
    return (
      <div className="mt-4 w-full">
        {myRsvp && myRsvp.response !== 'no' ? (
          <p className="text-center text-sm">
            {myRsvp.response === 'yes'
              ? t('posts.rsvp.attendingMessage', {
                  defaultValue: 'You are attending.',
                })
              : myRsvp.response === 'waitlist'
                ? t('events.rsvp.onWaitlist', {
                    defaultValue: 'You are on the waitlist.',
                  })
                : t('posts.rsvp.maybeMessage', {
                    defaultValue: 'You responded maybe.',
                  })}
          </p>
        ) : null}
        <p className="text-muted-foreground mt-2 text-center text-sm">
          {t('events.rsvp.ended', {
            defaultValue: 'This event has ended.',
          })}
        </p>
      </div>
    );
  }

  if (hideRsvpButton) return null;

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

  const waitlistDialog = (
    <EventWaitlistJoinDialog
      open={confirmingWaitlist}
      post={post}
      error={error}
      submitting={submitting}
      onClose={() => {
        if (!submitting) setConfirmingWaitlist(false);
      }}
      onConfirm={async () => {
        await confirmJoinWaitlist();
      }}
    />
  );

  if (offerExpiresAt) {
    return (
      <div className="mt-4 w-full">
        <p className="text-center text-sm">
          {t('events.rsvp.offerOpen', {
            defaultValue: 'A spot is open for you until {{until}}.',
            until: new Date(offerExpiresAt).toLocaleString(),
          })}
        </p>
        <Button
          variant="default"
          className="mt-2 w-full"
          disabled={submitting}
          action={claimSpot}
        >
          {t('events.rsvp.claimSpot', { defaultValue: 'Claim spot' })}
        </Button>
        <Button
          variant="outline"
          className="text-error mt-2 w-full"
          disabled={submitting}
          action={() => requestRespond('no')}
        >
          {t('events.rsvp.leaveWaitlist', {
            defaultValue: 'Leave waitlist',
          })}
        </Button>
        {error ? (
          <p className="text-error mt-2 text-center text-sm">{error}</p>
        ) : null}
      </div>
    );
  }

  if (onWaitlist) {
    return (
      <div className="mt-4 w-full">
        <p className="text-center text-sm">
          {t('events.rsvp.onWaitlist', {
            defaultValue: 'You are on the waitlist.',
          })}
        </p>
        <p className="text-muted-foreground mt-1 text-center text-sm">
          {t('events.rsvp.atCapacity', {
            defaultValue: 'This event is at capacity.',
          })}
        </p>
        <Button
          variant="outline"
          className="text-error mt-2 w-full"
          disabled={submitting}
          action={() => requestRespond('no')}
        >
          {t('events.rsvp.leaveWaitlist', {
            defaultValue: 'Leave waitlist',
          })}
        </Button>
        {error && !pending ? (
          <p className="text-error mt-2 text-center text-sm">{error}</p>
        ) : null}
        {scopeDialog}
      </div>
    );
  }

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
      {full ? (
        <p className="text-muted-foreground mb-2 text-center text-sm">
          {t('events.rsvp.atCapacity', {
            defaultValue: 'This event is at capacity.',
          })}
        </p>
      ) : null}
      <div className="flex w-full gap-x-2">
        <Button
          variant="default"
          className="w-[70%]"
          disabled={submitting}
          action={() => (full ? requestJoinWaitlist() : requestRespond('yes'))}
        >
          {full
            ? t('events.rsvp.joinWaitlist', { defaultValue: 'Join waitlist' })
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
      {error && !pending && !confirmingWaitlist ? (
        <p className="text-error mt-2 text-center text-sm">{error}</p>
      ) : null}
      {scopeDialog}
      {waitlistDialog}
    </div>
  );
};
