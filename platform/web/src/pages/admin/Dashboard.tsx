import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';

function Card({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-md border p-4">
      <h3 className="text-sm text-muted-foreground">{title}</h3>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const statsQuery = openpeepsApi.admin.useGeneralStats();

  useSetPageHeader(
    t('admin.dashboard.title', { defaultValue: 'Admin dashboard' }),
  );

  if (statsQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const stats = statsQuery.data;
  if (!stats) {
    return (
      <div className="p-4 text-sm text-muted-foreground">No stats available</div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <section>
        <h2 className="mb-3 text-lg font-medium">Profiles</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Total profiles" value={stats.profiles.all.all} />
          <Card
            title="Active (month)"
            value={stats.profiles.active.month.currentPeriod}
            hint={`vs. ${stats.profiles.active.month.lastPeriod} last month`}
          />
          <Card
            title="Active (week)"
            value={stats.profiles.active.week.currentPeriod}
          />
          <Card title="Active (day)" value={stats.profiles.active.day.currentPeriod} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Posts</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="All posts" value={stats.posts.all.all} />
          <Card title="Replies" value={stats.posts.replies.all} />
          <Card
            title="This month"
            value={stats.posts.all.month.currentPeriod}
          />
          <Card title="Interactions (all)" value={stats.interactions.all.all} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Jams</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Sessions" value={stats.jams.sessions.all} />
          <Card title="Participants" value={stats.jams.participants.all} />
        </div>
      </section>
    </div>
  );
}
