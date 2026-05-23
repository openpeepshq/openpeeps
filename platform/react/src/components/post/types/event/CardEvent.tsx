import { useMemo } from 'react';
import type { Event, PublicPost } from '@openpeeps/common/types';
import { calculateEffectiveRsvps, truncateText } from '@openpeeps/common/lib';
import { useOpenpeeps } from '../../../../contexts/openpeeps';
import { usePostViewRef } from '../../../../lib/postViewCounter';
import { EventLocation } from '../../pieces/EventLocation';

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
  const postViewRef = usePostViewRef(post.id);
  const { openpeepsApi } = useOpenpeeps();
  const event = post.data as Event;
  const jamStateQuery = openpeepsApi.useJamState(post.id);
  const rsvps = useMemo(() => calculateEffectiveRsvps(post) || [], [post]);

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
          {event.jam ? (
            <div className="text-muted-foreground text-xs">
              {jamStateQuery.isLoading ? (
                <span>Loading jam…</span>
              ) : (
                <span>
                  {rsvps.length} {rsvps.length === 1 ? 'RSVP' : 'RSVPs'}
                  {jamStateQuery.data?.participants?.length
                    ? ` · ${jamStateQuery.data.participants.length} in jam`
                    : ''}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </a>
  );
}
