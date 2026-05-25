import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function AdminAnalytics() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const statsQuery = openpeepsApi.admin.useGeneralStats();

  useSetPageHeader(t('admin.analytics.title', { defaultValue: 'Analytics' }));

  if (statsQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const stats = statsQuery.data;
  if (!stats) return null;

  const periods = ['day', 'week', 'month', 'quarter', 'year'] as const;

  return (
    <div className="space-y-6 p-4">
      <section>
        <h2 className="mb-2 text-lg font-medium">Active profiles</h2>
        <div className="rounded-md border p-4">
          {periods.map((p) => (
            <StatRow
              key={p}
              label={`${p}: current period`}
              value={stats.profiles.active[p].currentPeriod}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Posts</h2>
        <div className="rounded-md border p-4">
          {periods.map((p) => (
            <StatRow
              key={p}
              label={`${p}: posts`}
              value={stats.posts.all[p].currentPeriod}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Top profiles (this month)</h2>
        <div className="rounded-md border">
          {stats.topLists.profiles.month.map((profile) => (
            <a
              key={profile.id}
              href={`/@${profile.handle}`}
              className="flex items-center justify-between border-b p-2 last:border-b-0 hover:bg-surface-100"
            >
              <span>{profile.displayName || `@${profile.handle}`}</span>
              <span className="text-sm text-muted-foreground">
                score {profile.activityScore.toFixed(0)}
              </span>
            </a>
          ))}
          {stats.topLists.profiles.month.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No data</p>
          )}
        </div>
      </section>
    </div>
  );
}
