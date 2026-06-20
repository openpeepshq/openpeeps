import { ProfileGuard } from '@openpeeps/react/components';

export function AdminDb() {
  return (
    <ProfileGuard neededCapabilities={['core-db-access']}>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Database admin</h1>
        <p className="text-muted-foreground">
          OpenPeeps uses PostgreSQL. The former ArangoDB web UI is no longer
          available. Inspect and edit data with one of these tools:
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
    </ProfileGuard>
  );
}
