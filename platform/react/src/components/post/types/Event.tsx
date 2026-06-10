import type { PublicPost } from '@openpeeps/common/types';
import { useT } from '../../../i18n';
import { resolveStaticUrl, useStaticRender } from '../../markdown/staticRender';

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

  const event = post.data as {
    name?: string;
    image?: string;
    start: string;
    end?: string;
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {event.image && (
        <img
          src={event.image}
          className="h-48 w-full object-cover"
          alt={`image for ${event.name ?? 'event'}`}
        />
      )}
      <div className="flex w-full items-center justify-between">
        <span className="text-error-600 text-sm">
          {fmtRange(event.start, event.end)}
          {' '}
          <span className="text-muted-foreground">(your local time)</span>
        </span>
        <a
          href={resolveStaticUrl(`/posts/${post.id}`, staticRender ? baseUrl : undefined)}
          className="rounded-md border border-primary px-3 py-1 text-sm text-primary hover:bg-primary/10"
        >
          {t('posts.event.viewEvent', { defaultValue: 'View Event' })}
        </a>
      </div>
      <div className="text-lg font-medium">{event.name}</div>
    </div>
  );
}
