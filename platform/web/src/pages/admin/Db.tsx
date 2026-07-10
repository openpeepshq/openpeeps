import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileGuard } from '@openpeeps/react/components';
import { useOpenpeeps } from '@openpeeps/react';

const FallbackInstructions = () => (
  <div className="mx-auto max-w-2xl space-y-6 p-6">
    <h1 className="text-2xl font-semibold">Database admin</h1>
    <p className="text-muted-foreground">
      The in-app database browser is not available (pgweb is not configured or
      not reachable). Inspect data with one of these tools:
    </p>
    <section className="space-y-2">
      <h2 className="text-lg font-medium">Drizzle Studio</h2>
      <p className="text-muted-foreground text-sm">
        From the repo root, with Postgres running locally:
      </p>
      <pre className="bg-muted overflow-x-auto rounded-md p-3 text-sm">
        pnpm --filter @openpeeps/core db:studio
      </pre>
    </section>
    <section className="space-y-2">
      <h2 className="text-lg font-medium">psql</h2>
      <p className="text-muted-foreground text-sm">
        Connect using <code className="text-xs">DATABASE_URL</code> (default
        local:
        <code className="text-xs">
          {' '}
          postgresql://openpeeps:openpeeps@localhost:5432/openpeeps
        </code>
        ):
      </p>
      <pre className="bg-muted overflow-x-auto rounded-md p-3 text-sm">
        psql &quot;$DATABASE_URL&quot;
      </pre>
    </section>
  </div>
);

export function AdminDb() {
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const tokenQuery = openpeepsApi.admin.useDbToken();
  const [authReady, setAuthReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (tokenQuery.isError) {
      navigate('/');
    }
  }, [tokenQuery.isError, navigate]);

  useEffect(() => {
    const token = tokenQuery.data?.token;
    if (!token) return;

    let cancelled = false;
    void fetch(`/_db?token=${encodeURIComponent(token)}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setUnavailable(true);
          return;
        }
        setAuthReady(true);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, [tokenQuery.data?.token]);

  return (
    <ProfileGuard neededCapabilities={['core-db-access']}>
      {unavailable ? (
        <FallbackInstructions />
      ) : !authReady || tokenQuery.isLoading ? (
        <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
          Opening database browser…
        </div>
      ) : (
        <iframe
          src="/_db"
          title="Database browser"
          className="h-[calc(100vh-2rem)] w-full border-0"
        />
      )}
    </ProfileGuard>
  );
}
