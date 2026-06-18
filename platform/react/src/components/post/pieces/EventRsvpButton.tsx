import { useMemo, useState } from 'react';
import type { PublicPost } from '@openpeeps/common/types';
import {
  calculateEffectiveRsvps,
  checkPostCapabilities,
  countYesRsvps,
  isCapacityEvent,
} from '@openpeeps/common/lib';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useAuthData, useCurrentProfile } from '../../layout/IdentityContext';
import { useCapabilities } from '../../server-data';
import { Button } from '@openpeeps/react-ui';
import { apiErrorMessage } from '../../../lib/apiErrorMessage';

export interface EventRsvpButtonProps {
  post: PublicPost;
}

export function EventRsvpButton({ post }: EventRsvpButtonProps) {
  const t = useT();
  const profile = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const { openpeepsApi } = useOpenpeeps();
  const rsvpToEvent = openpeepsApi.rsvpToEventAction({ id: post.id });
  const [error, setError] = useState<string | null>(null);

  const eventData = post.data?.type === 'event' ? post.data : undefined;
  const capacityEvent = eventData ? isCapacityEvent(eventData) : false;
  const atCapacity =
    capacityEvent &&
    eventData?.maxAttendees !== undefined &&
    countYesRsvps(post) >= eventData.maxAttendees;

  const myEvent = post.profile?.id === profile?.id;
  const myRsvp = useMemo(
    () =>
      calculateEffectiveRsvps(post).find((r) => r.profile.id === profile?.id),
    [post, profile?.id],
  );
  const canRsvp = useMemo(
    () =>
      checkPostCapabilities(authData, ['core-posts-rsvp'], post, capabilities)
        .success,
    [authData, post, capabilities],
  );

  if (myEvent || !profile) return null;
  if (!canRsvp && !(myRsvp && myRsvp.response !== 'no')) return null;

  const respond = async (response: 'yes' | 'tentative' | 'no') => {
    setError(null);
    try {
      await rsvpToEvent({ response });
    } catch (err) {
      setError(apiErrorMessage(err, t));
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

  if (myRsvp && myRsvp.response !== 'no') {
    return (
      <div className="w-full">
        <Button
          variant="variant-ringed-secondary"
          className="text-error w-full"
          action={() => respond('no')}
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
        {error ? (
          <p className="text-error mt-2 text-center text-sm">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 w-full">
      <div className="flex w-full gap-x-2">
        <Button
          variant="variant-filled-primary"
          className="w-[70%]"
          disabled={full}
          action={() => respond('yes')}
        >
          {full
            ? t('events.rsvp.full', { defaultValue: 'Event is full' })
            : t('posts.rsvp.register', { defaultValue: 'Register' })}
        </Button>
        {!capacityEvent ? (
          <Button
            variant="variant-ghost-primary"
            action={() => respond('tentative')}
          >
            {t('posts.rsvp.maybe', { defaultValue: 'Maybe' })}
          </Button>
        ) : null}
        <Button variant="variant-ringed-primary" action={() => respond('no')}>
          {t('posts.rsvp.no', { defaultValue: 'No' })}
        </Button>
      </div>
      {error ? (
        <p className="text-error mt-2 text-center text-sm">{error}</p>
      ) : null}
    </div>
  );
}
