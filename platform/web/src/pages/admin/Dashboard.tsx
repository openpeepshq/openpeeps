import { Hash, UsersRound } from 'lucide-react';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { useServerInfo } from '@openpeeps/react/components';
import { CommunityStatsCard, SignupChart } from './components/AdminCharts';

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
      <h3 className="text-muted-foreground text-sm">{title}</h3>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}

export function AdminDashboard() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const serverInfo = useServerInfo();
  const statsQuery = openpeepsApi.admin.useGeneralStats();

  useSetPageHeader(
    t('admin.dashboard.title', { defaultValue: 'Administration' }),
  );

  if (statsQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const stats = statsQuery.data;
  if (!stats) {
    return (
      <div className="text-muted-foreground p-4 text-sm">
        No stats available
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border">
          <header className="flex items-center gap-2 border-b p-4">
            <UsersRound size={24} />
            <h3 className="text-lg font-medium">
              {t('admin.overview.communityName', {
                defaultValue: 'Community Name',
              })}
            </h3>
          </header>
          <section className="p-4">
            {serverInfo?.communityConfig.info.name ?? ''}
          </section>
        </div>
        <div className="rounded-md border">
          <header className="flex items-center gap-2 border-b p-4">
            <Hash size={24} />
            <h3 className="text-lg font-medium">
              {t('admin.overview.serverVersion', {
                defaultValue: 'Server Version',
              })}
            </h3>
          </header>
          <section className="p-4">{serverInfo?.version ?? ''}</section>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium">
          {t('admin.overview.communityOverview', {
            defaultValue: 'Community overview',
          })}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CommunityStatsCard
            title={t('admin.overview.totalProfiles', {
              defaultValue: 'Total Profiles',
            })}
            current={stats.profiles.all.all}
            previous={
              stats.profiles.all.all - stats.profiles.all.week.currentPeriod
            }
            text={t('admin.overview.lastWeek', { defaultValue: 'Last Week' })}
          />
          <CommunityStatsCard
            title={t('admin.overview.activeProfiles', {
              defaultValue: 'Active Profiles',
            })}
            current={stats.profiles.active.week.currentPeriod}
            previous={stats.profiles.active.week.lastPeriod}
            text={t('admin.overview.lastWeek', { defaultValue: 'Last Week' })}
          />
          <CommunityStatsCard
            title={t('admin.overview.recentInteractions', {
              defaultValue: 'Recent Interactions',
            })}
            current={stats.interactions.all.week.currentPeriod}
            previous={stats.interactions.all.week.lastPeriod}
            text={t('admin.overview.lastWeek', { defaultValue: 'Last Week' })}
          />
          <CommunityStatsCard
            title={t('admin.overview.allPosts', { defaultValue: 'All Posts' })}
            current={stats.posts.all.all}
            previous={stats.posts.all.all - stats.posts.all.week.currentPeriod}
            text={t('admin.overview.lastWeek', { defaultValue: 'Last Week' })}
          />
          <CommunityStatsCard
            title={t('admin.overview.jamSessions', {
              defaultValue: 'Jam Sessions',
            })}
            current={stats.jams.sessions.all}
            previous={stats.jams.sessions.week.lastPeriod}
            text={t('admin.overview.lastWeek', { defaultValue: 'Last Week' })}
          />
          <CommunityStatsCard
            title={t('admin.overview.jamParticipants', {
              defaultValue: 'Jam Participants',
            })}
            current={stats.jams.participants.week.currentPeriod}
            previous={stats.jams.participants.week.lastPeriod}
            text={t('admin.overview.lastWeek', { defaultValue: 'Last Week' })}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">
          {t('admin.overview.newSignups', { defaultValue: 'New signups' })}
        </h2>
        <SignupChart stats={stats} />
      </section>

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
          <Card
            title="Active (day)"
            value={stats.profiles.active.day.currentPeriod}
          />
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
