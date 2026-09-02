import type { Event, PublicPost } from '@openpeepshq/common/types';
import {
  formatEventRecurrence,
  formatEventWhen,
} from '@openpeepshq/common/lib';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { resolveStaticUrl, useStaticRender } from '../../markdown/staticRender';
import { EventLocation } from '../pieces/EventLocation';

export interface FeedEventProps {
  post: PublicPost;
}

const fmtRange = (start: string, end?: string): string => {
  const s = new Date(start).toLocaleString();
  if (!end) return s;
  return `${s} → ${new Date(end).toLocaleString()}`;
};

export function FeedEvent({ post }: FeedEventProps) {
  const t = useT();
  const { enabled: staticRender, baseUrl } = useStaticRender();

  if (post?.data?.type !== 'event') {
    return (
      <h1>
        FeedEvent was used but post type is not "event". Please report this to
        the developers.
      </h1>
    );
  }

  const event = post.data as Event;
  const start = post.occurrenceStart ?? event.start;
  const end = post.occurrenceEnd ?? event.end;
  const when = staticRender
    ? formatEventWhen(start, { end, timeZone: event.timeZone })
    : fmtRange(start, end);

  return (
    <div className="flex w-full flex-col gap-2">
      {event.image && (
        <span className="aspect-video w-full overflow-hidden">
          <img
            src={event.image}
            className="h-full w-full object-cover"
            alt={`image for ${event.name ?? 'event'}`}
          />
        </span>
      )}
      <div className="flex w-full items-center justify-between">
        <span className="text-destructive text-sm">
          {when}{' '}
          {staticRender ? null : (
            <span className="text-muted-foreground">(your local time)</span>
          )}
        </span>
        <Button
          action={resolveStaticUrl(
            `/posts/${post.id}`,
            staticRender ? baseUrl : undefined,
          )}
          variant="outline"
          compact
          className="shrink-0"
        >
          {t('posts.event.viewEvent', { defaultValue: 'View Event' })}
        </Button>
      </div>
      <div className="text-lg font-medium">{event.name}</div>
      {event.recurrence ? (
        <p className="text-muted-foreground text-sm">
          {formatEventRecurrence(event.recurrence, t, event.start)}
        </p>
      ) : null}
      <EventLocation post={post} />
    </div>
  );
}
