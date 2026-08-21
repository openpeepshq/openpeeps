import type { PublicPost } from '@openpeepshq/common/types';
import { isCapacityEvent } from '@openpeepshq/common/lib';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { EventRsvpButton } from '../post/pieces/EventRsvpButton';

export interface JamCapacityGateProps {
  jamPost: PublicPost;
  reason: 'full' | 'rsvp-required' | 'removed';
  eventName?: string;
  occurrence?: string;
}

export const JamCapacityGate = ({
  jamPost,
  reason,
  eventName,
  occurrence,
}: JamCapacityGateProps) => {
  const t = useT();
  const me = useCurrentProfile();
  const eventData = jamPost.data?.type === 'event' ? jamPost.data : undefined;
  const showRsvp =
    reason === 'rsvp-required' &&
    !!me &&
    !!eventData &&
    isCapacityEvent(eventData);

  const message =
    reason === 'full'
      ? t('error.eventAtCapacity', { defaultValue: 'This event is full.' })
      : reason === 'removed'
        ? t('events.rsvp.removedMessage', {
            defaultValue: 'The organizer has removed you from this event.',
          })
        : t('error.jamRsvpRequired', {
            defaultValue: 'You must RSVP yes to join this event.',
          });

  return (
    <div className="mx-auto flex h-full w-full items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5 text-center">
        {eventName ? <h3 className="text-lg">{eventName}</h3> : null}
        <div className="bg-surface flex w-full flex-col items-center justify-center space-y-4 rounded border p-4">
          <p className="text-sm">{message}</p>
          {showRsvp ? (
            <div className="w-full px-2">
              <EventRsvpButton post={jamPost} recurrenceId={occurrence} />
            </div>
          ) : null}
          <a
            href={`/posts/${jamPost.id}`}
            className="text-primary text-sm underline"
          >
            {t('jams.room.viewEvent', { defaultValue: 'View event' })}
          </a>
          {!me ? (
            <div className="flex flex-col items-center gap-2">
              <a
                href={`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm"
              >
                {t('navigation.logIn', { defaultValue: 'Log in' })}
              </a>
              <span className="text-muted-foreground text-sm">
                {t('navigation.haveAccount', {
                  defaultValue: 'Already have an account?',
                })}{' '}
                <a href="/auth/register" className="underline">
                  {t('navigation.joinCommunity', {
                    defaultValue: 'Join the community',
                  })}
                </a>
              </span>
            </div>
          ) : (
            <a
              href="/jams"
              className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm"
            >
              {t('jams.discover.checkOtherJams', {
                defaultValue: 'Check other jams',
              })}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
