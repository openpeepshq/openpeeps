import { useMemo } from 'react';
import type { PublicPost } from '@openpeeps/common/types';
import { calculateEffectiveRsvps, checkPostCapabilities } from '@openpeeps/common/lib';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useAuthData, useCurrentProfile } from '../../layout/IdentityContext';
import { useCapabilities } from '../../server-data';
import { Button } from '@openpeeps/react-ui';

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

  const respond = (response: 'yes' | 'tentative' | 'no') =>
    rsvpToEvent({ response });

  if (myRsvp && myRsvp.response !== 'no') {
    return (
      <div className="w-full">
        <Button
          variant="variant-ringed-secondary"
          className="text-error w-full"
          action={() => respond('no')}
        >
          {t('posts.rsvp.cancelRegistration', { defaultValue: 'Cancel registration' })}
        </Button>
        <p className="mt-2 text-center text-sm">
          {myRsvp.response === 'yes'
            ? t('posts.rsvp.attendingMessage', { defaultValue: 'You are attending.' })
            : t('posts.rsvp.maybeMessage', { defaultValue: 'You responded maybe.' })}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex w-full gap-x-2">
      <Button
        variant="variant-filled-primary"
        className="w-[70%]"
        action={() => respond('yes')}
      >
        {t('posts.rsvp.register', { defaultValue: 'Register' })}
      </Button>
      <Button variant="variant-ghost-primary" action={() => respond('tentative')}>
        {t('posts.rsvp.maybe', { defaultValue: 'Maybe' })}
      </Button>
      <Button variant="variant-ringed-primary" action={() => respond('no')}>
        {t('posts.rsvp.no', { defaultValue: 'No' })}
      </Button>
    </div>
  );
}
