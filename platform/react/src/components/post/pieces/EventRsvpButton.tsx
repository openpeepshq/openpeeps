import { useMemo, useState } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  checkPostCapabilities,
  countYesRsvps,
  defaultRsvpRecurrenceId,
  displayRsvpForProfile,
  isCapacityEvent,
  isRecurringEvent,
  listRsvpOccurrences,
  recurringEventHasOpenOccurrence,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useAuthData, useCurrentProfile } from '../../layout/IdentityContext';
import { useCapabilities } from '../../server-data';
import { Button } from '@openpeepshq/react-ui';
import { apiErrorMessage } from '../../../lib/apiErrorMessage';
import {
  EventRsvpScopeDialog,
  type RsvpScopeChoice,
} from './EventRsvpScopeDialog';

export interface EventRsvpButtonProps {
  post: PublicPost;
  recurrenceId?: string;
  lockToOccurrence?: boolean;
}

type RsvpChoice = 'yes' | 'tentative' | 'no';

export const EventRsvpButton = ({
  post,
  recurrenceId,
  lockToOccurrence = false,
}: EventRsvpButtonProps) => {
  const t = useT();
  const profile = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const { openpeepsApi } = useOpenpeeps();
  const rsvpToEvent = openpeepsApi.rsvpToEventAction({ id: post.id });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<RsvpChoice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const eventData = post.data?.type === 'event' ? post.data : undefined;
  const recurring = eventData ? isRecurringEvent(eventData) : false;
  const defaultId = eventData
    ? defaultRsvpRecurrenceId(eventData, recurrenceId)
    : undefined;
  const occurrences =
    eventData && recurring ? listRsvpOccurrences(eventData) : [];
  const capacityRecurrenceId = lockToOccurrence ? recurrenceId : defaultId;
  const capacityEvent = eventData ? isCapacityEvent(eventData) : false;
  const atCapacity =
    capacityEvent &&
    eventData?.maxAttendees !== undefined &&
    (recurring && !lockToOccurrence
      ? !recurringEventHasOpenOccurrence(post, profile?.id)
      : countYesRsvps(post, capacityRecurrenceId) >= eventData.maxAttendees);

  const myEvent = post.profile?.id === profile?.id;
  const myRsvp = useMemo(
    () =>
      profile
        ? displayRsvpForProfile(post, profile.id, {
            recurrenceId,
            lockToOccurrence,
          })
        : undefined,
    [post, profile, recurrenceId, lockToOccurrence],
  );
  const canRsvp = useMemo(
    () =>
      checkPostCapabilities(authData, ['core-posts-rsvp'], post, capabilities)
        .success,
    [authData, post, capabilities],
  );

  if (myEvent || !profile) return null;
  if (!canRsvp && !(myRsvp && myRsvp.response !== 'no')) return null;

  const writeRsvp = async (response: RsvpChoice, recurrenceIds?: string[]) => {
    setError(null);
    setSubmitting(true);
    try {
      if (recurrenceIds?.length === 1) {
        await rsvpToEvent({ response, recurrenceId: recurrenceIds[0] });
        return;
      }
      if (recurrenceIds?.length) {
        await rsvpToEvent({ response, recurrenceIds });
        return;
      }
      await rsvpToEvent({ response });
    } catch (err) {
      setError(apiErrorMessage(err, t));
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const requestRespond = (response: RsvpChoice) => {
    if (!recurring || lockToOccurrence) {
      writeRsvp(response, recurrenceId ? [recurrenceId] : undefined).catch(
        () => undefined,
      );
      return;
    }
    setError(null);
    setPending(response);
  };

  const confirmScope = async (scope: RsvpScopeChoice) => {
    if (!pending) return;
    try {
      if (scope.kind === 'series') {
        await writeRsvp(pending);
      } else if (scope.kind === 'this') {
        await writeRsvp(pending, [scope.recurrenceId]);
      } else {
        await writeRsvp(pending, scope.recurrenceIds);
      }
      setPending(null);
    } catch {
      // error already set
    }
  };

  if (myRsvp?.response === 'removed') {
    return (
      <p className="text-muted-foreground mt-4 text-center text-sm">
        {t('events.rsvp.removedMessage', {
          defaultValue: 'The organizer has removed you from this event.',
        })}
      </p>
    );
  }

  const full = atCapacity && myRsvp?.response !== 'yes';
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
        onConfirm={confirmScope}
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
