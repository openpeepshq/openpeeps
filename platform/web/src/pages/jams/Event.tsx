import { useSearchParams, useParams } from 'react-router-dom';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { JamRoom } from '@openpeeps/react/components';

/**
 * `/events/:eventId/jam` — loads the jam post and hands it off to
 * `<JamRoom>` from `@openpeeps/react`. Honors the `?observer=1` query string
 * for moderator/observer mode. Rendered full-screen (outside the sidebar
 * `RootLayout`); the wrapper guarantees a full-viewport height so the lobby
 * and non-room states fill the screen.
 */
export function JamEvent() {
  const t = useT();
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const { openpeepsApi } = useOpenpeeps();

  const observer =
    searchParams.get('observer') === '1' ||
    searchParams.get('observer') === 'true';

  const postQuery = openpeepsApi.usePost(eventId ?? '');

  return (
    <div className="bg-card h-screen w-screen overflow-hidden">
      {postQuery.isLoading ? (
        <div className="text-muted-foreground flex h-full w-full items-center justify-center p-6 text-sm">
          {t('jams.room.loading', { defaultValue: 'Loading jam…' })}
        </div>
      ) : !postQuery.data ? (
        <div className="text-muted-foreground flex h-full w-full items-center justify-center p-6 text-sm">
          {t('jams.room.notFound', { defaultValue: 'Jam not found' })}
        </div>
      ) : (
        <JamRoom jamPost={postQuery.data} observer={observer} />
      )}
    </div>
  );
}
