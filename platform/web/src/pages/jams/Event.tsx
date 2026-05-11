import { useSearchParams, useParams } from 'react-router-dom';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { JamRoom } from '@openpeeps/react/components';

/**
 * `/events/:eventId/jam` — loads the jam post and hands it off to
 * `<JamRoom>` from `@openpeeps/react`. Honors the `?observer=1` query string
 * for moderator/observer mode.
 */
export function JamEvent() {
  const t = useT();
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const { openpeepsApi } = useOpenpeeps();

  const observer = searchParams.get('observer') === '1';

  const postQuery = openpeepsApi.usePost(eventId ?? '');

  if (postQuery.isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-sm text-muted-foreground">
        {t('jams.room.loading', { defaultValue: 'Loading jam…' })}
      </div>
    );
  }

  if (!postQuery.data) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-sm text-muted-foreground">
        {t('jams.room.notFound', { defaultValue: 'Jam not found' })}
      </div>
    );
  }

  return <JamRoom jamPost={postQuery.data} observer={observer} />;
}
