import type { Event, PublicPost } from '@openpeepshq/common/types';
import { getJamUrl, truncateText } from '@openpeepshq/common/lib';
import { Button } from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../../../contexts/openpeeps';
import { useT } from '../../../../i18n';
import { useCurrentProfile } from '../../../layout/IdentityContext';
import { usePostViewRef } from '../../../../lib/postViewCounter';
import { EventLocation } from '../../pieces/EventLocation';
import { ParticipantsCard } from '../../pieces/ParticipantsCard';
import { ProfileEventRelationship } from './ProfileEventRelationship';

export interface CardEventProps {
  post: PublicPost;
}

function formatEventTimespan(event: Event, startIso?: string, endIso?: string) {
  const startValue = startIso ?? event.start;
  if (!startValue) return '';
  const start = new Date(startValue);
  const end =
    (endIso ?? event.end) ? new Date(endIso ?? event.end!) : undefined;
  const datePart = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timePart = start.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (end) {
    return `${datePart} · ${timePart} – ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `${datePart} · ${timePart}`;
}

export function CardEvent({ post }: CardEventProps) {
  const t = useT();
  const me = useCurrentProfile();
  const postViewRef = usePostViewRef(post.id);
  const { openpeepsApi } = useOpenpeeps();
  const event = post.data as Event;
  const jam = event.jam;
  const occurrenceId = post.occurrenceRecurrenceId;
  const jamStateQuery = openpeepsApi.useJamState(post.id, occurrenceId);
  const jamState = jam ? jamStateQuery.data : undefined;
  const attendeesLength = jamState?.participants.length ?? 0;

  const jamLink = getJamUrl(
    post.id,
    typeof window !== 'undefined' ? window.location.origin : undefined,
    occurrenceId,
  );

  const postLink = occurrenceId
    ? `/posts/${post.id}?occurrence=${encodeURIComponent(occurrenceId)}`
    : `/posts/${post.id}`;

  return (
    <article
      ref={postViewRef}
      className="hover:bg-surface mb-6 w-full overflow-hidden rounded-lg border"
    >
      <a href={postLink} className="block">
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={event.image || '/img/event-default.png'}
            alt={event.name ? `image for ${event.name}` : 'Event'}
            className="h-full w-full object-cover"
          />
        </div>
      </a>
      <div className="grid gap-y-4 p-4">
        <a href={postLink} className="block text-inherit no-underline">
          <p className="text-muted-foreground text-sm">
            {formatEventTimespan(
              event,
              post.occurrenceStart,
              post.occurrenceEnd,
            )}
          </p>
          <h3 className="text-xl font-semibold">
            {truncateText(event.name, 100) || '-'}
          </h3>
        </a>
        {event.recurrence ? (
          <p className="text-muted-foreground text-xs">
            {t('events.repeat.badge', { defaultValue: 'Repeats' })}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <EventLocation post={post} truncate occurrence={occurrenceId} />
          <ProfileEventRelationship post={post} />
        </div>
        {jam && me ? (
          jamState?.active ? (
            <div className="text-muted-foreground flex items-center justify-start gap-2 text-xs">
              <span className="w-12">
                <ParticipantsCard jamState={jamState} />
              </span>
              <span>
                {attendeesLength}{' '}
                {attendeesLength === 1
                  ? t('events.jam.attendee', { defaultValue: 'attendee' })
                  : t('events.jam.attendees', { defaultValue: 'attendees' })}
              </span>
              <Button action={jamLink} variant="default" compact>
                {t('jam.join.submit', { defaultValue: 'Join Jam' })}
              </Button>
            </div>
          ) : jam.moderators.includes(me.id) ? (
            <div>
              <Button action={jamLink} variant="default">
                {t('jam.start.submit', { defaultValue: 'Start Jam' })}
              </Button>
            </div>
          ) : null
        ) : null}
      </div>
    </article>
  );
}
