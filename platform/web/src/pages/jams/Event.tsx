import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useT, useOpenpeeps, useCredentialsStore, useSetPageHeader } from '@openpeeps/react';
import { JamRoom, useCurrentProfile } from '@openpeeps/react/components';

/**
 * `/events/:eventId/jam` — loads the jam post and hands it off to
 * `<JamRoom>` from `@openpeeps/react`. Honors the `?observer=1` query string
 * for moderator/observer mode. Rendered full-screen (outside the sidebar
 * `RootLayout`); the wrapper guarantees a full-viewport height so the lobby
 * and non-room states fill the screen.
 */
export function JamEvent() {
  const t = useT();
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const { openpeepsApi } = useOpenpeeps();
  const { credentialsStore } = useCredentialsStore();
  const me = useCurrentProfile();

  const observer =
    searchParams.get('observer') === '1' ||
    searchParams.get('observer') === 'true';

  // Guest/auth handoff: a `?token=` param authenticates this device before the
  // jam post is fetched, mirroring the Svelte jam route.
  const token = searchParams.get('token');
  const tokenApplied = useRef(false);
  if (token && !tokenApplied.current) {
    tokenApplied.current = true;
    void credentialsStore.set({ token });
  }

  const postQuery = openpeepsApi.usePost(eventId ?? '');

  const jamEvent =
    postQuery.data?.data?.type === 'event' ? postQuery.data.data : undefined;

  useSetPageHeader(
    jamEvent?.name
      ? t('jams.room.pageTitle', {
          name: jamEvent.name,
          defaultValue: 'Jam Room - {{name}}',
        })
      : undefined,
  );

  // On a capability/access error, send guests to login (preserving the return
  // path) and authenticated users back to the jams list.
  useEffect(() => {
    if (!postQuery.isError || !postQuery.error?.message) return;
    if (me) {
      navigate('/jams');
    } else {
      navigate(`/auth/login?redirect=${window.location.pathname}`);
    }
  }, [postQuery.isError, postQuery.error, me, navigate]);

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
