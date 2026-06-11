import type { Event, PublicPost } from '@openpeeps/common/types';
import { getJamUrl, truncateText } from '@openpeeps/common/lib';
import { Button } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../../contexts/openpeeps';
import { useT } from '../../../../i18n';
import { useCurrentProfile } from '../../../layout/IdentityContext';
import { usePostViewRef } from '../../../../lib/postViewCounter';
import { EventLocation } from '../../pieces/EventLocation';
import { ParticipantsCard } from '../../pieces/ParticipantsCard';

export interface CardEventProps {
  post: PublicPost;
}

function formatEventTimespan(event: Event) {
  if (!event.start) return '';
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : undefined;
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
  const jamStateQuery = openpeepsApi.useJamState(post.id);
  const jamState = jam ? jamStateQuery.data : undefined;
  const attendeesLength = jamState?.participants.length ?? 0;

  const jamLink = getJamUrl(
    post.id,
    typeof window !== 'undefined' ? window.location.origin : undefined,
  );

  return (
    <a
      href={`/posts/${post.id}`}
      className="hover:bg-surface-100 mb-6 block w-full overflow-hidden rounded-lg border"
    >
      <div ref={postViewRef}>
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={event.image || '/img/event-default.png'}
            alt={event.name ? `image for ${event.name}` : 'Event'}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="grid gap-y-4 p-4">
          <p className="text-muted-foreground text-sm">{formatEventTimespan(event)}</p>
          <h3 className="text-xl font-semibold">
            {truncateText(event.name, 100) || '-'}
          </h3>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <EventLocation post={post} truncate />
          </div>
          {jam && me ? (
            jamState?.active ? (
              <div className="text-surface-600 flex items-center justify-start gap-2 text-xs">
                <span className="w-12">
                  <ParticipantsCard jamState={jamState} />
                </span>
                <span>
                  {attendeesLength}{' '}
                  {attendeesLength === 1
                    ? t('events.jam.attendee', { defaultValue: 'attendee' })
                    : t('events.jam.attendees', { defaultValue: 'attendees' })}
                </span>
                <Button action={jamLink} variant="variant-filled-primary" compact>
                  {t('jam.join.submit', { defaultValue: 'Join Jam' })}
                </Button>
              </div>
            ) : jam.moderators.includes(me.id) ? (
              <div>
                <Button action={jamLink} variant="variant-filled-primary">
                  {t('jam.start.submit', { defaultValue: 'Start Jam' })}
                </Button>
              </div>
            ) : null
          ) : null}
        </div>
      </div>
    </a>
  );
}
