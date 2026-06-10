import { ExternalLink, Link as LinkIcon, MapPin, PhoneCall } from 'lucide-react';
import type { Event, PublicPost } from '@openpeeps/common/types';
import { getJamUrl, truncateText } from '@openpeeps/common/lib';

export interface EventLocationProps {
  post: PublicPost;
  preview?: boolean;
  truncate?: boolean;
}

export function EventLocation({
  post,
  preview = true,
  truncate = false,
}: EventLocationProps) {
  if (post.data?.type !== 'event') return null;
  const event = post.data as Event;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jamLink = getJamUrl(post.id, origin);

  if (preview) {
    return (
      <div className="flex items-center gap-1 text-sm">
        {event.physicalLocation ? (
          <>
            <MapPin className="h-4 w-4 shrink-0" />
            <span>
              {truncate
                ? truncateText(event.physicalLocation.text)
                : event.physicalLocation.text}
            </span>
          </>
        ) : event.jam ? (
          <>
            <PhoneCall className="h-4 w-4 shrink-0" />
            <a href={jamLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Jam Event
            </a>
          </>
        ) : event.url ? (
          <>
            <LinkIcon className="h-4 w-4 shrink-0" />
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1 hover:underline"
            >
              Online
              <ExternalLink className="h-4 w-4" />
            </a>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 flex gap-x-4">
      <div className="border-foreground/20 flex items-center justify-center rounded-md border px-4 py-1">
        {event.physicalLocation ? (
          <MapPin className="text-muted-foreground my-3" size={24} />
        ) : event.jam ? (
          <PhoneCall className="text-muted-foreground my-3" size={24} />
        ) : event.url ? (
          <LinkIcon className="text-muted-foreground my-3" size={24} />
        ) : null}
      </div>
      <div>
        {event.physicalLocation ? (
          <p>{truncate ? truncateText(event.physicalLocation.text) : event.physicalLocation.text}</p>
        ) : event.jam ? (
          <>
            <p>Jam Event</p>
            <a href={jamLink} target="_blank" rel="noreferrer" className="text-primary mt-2 block text-sm">
              {truncateText(jamLink, 30)}
            </a>
          </>
        ) : event.url ? (
          <>
            <p>External Event</p>
            <a href={event.url} target="_blank" rel="noreferrer" className="text-primary mt-2 block text-sm">
              {truncateText(event.url, 40)}
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}
