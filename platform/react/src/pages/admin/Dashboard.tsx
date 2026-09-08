import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { CommunityStatsCard, SignupChart } from './components/AdminCharts';
import { ServerStatusSection } from './components/ServerStatusSection';
import { LoadingSpinner } from '@openpeepshq/react-ui';

const Card = ({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) => (
  <div className="rounded-md border p-4">
    <h3 className="text-muted-foreground text-sm">{title}</h3>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
    {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
  </div>
);

export const AdminDashboard = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const statsQuery = openpeepsApi.admin.useGeneralStats();
  const statusQuery = openpeepsApi.admin.useServerStatus();

  useSetPageHeader(
    t('admin.dashboard.title', { defaultValue: 'Administration' }),
  );

  if (statsQuery.isLoading && statusQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  const stats = statsQuery.data;
  const status = statusQuery.data;

  if (!stats && !status) {
    return (
      <div className="text-muted-foreground p-4 text-sm">
        {t('admin.overview.noStats', { defaultValue: 'No stats available' })}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {status ? <ServerStatusSection status={status} /> : null}

      {stats ? (
        <>
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
                text={t('admin.overview.lastWeek', {
                  defaultValue: 'Last Week',
                })}
              />
              <CommunityStatsCard
                title={t('admin.overview.activeProfiles', {
                  defaultValue: 'Active Profiles',
                })}
                current={stats.profiles.active.week.currentPeriod}
                previous={stats.profiles.active.week.lastPeriod}
                text={t('admin.overview.lastWeek', {
                  defaultValue: 'Last Week',
                })}
              />
              <CommunityStatsCard
                title={t('admin.overview.recentInteractions', {
                  defaultValue: 'Recent Interactions',
                })}
                current={stats.interactions.all.week.currentPeriod}
                previous={stats.interactions.all.week.lastPeriod}
                text={t('admin.overview.lastWeek', {
                  defaultValue: 'Last Week',
                })}
              />
              <CommunityStatsCard
                title={t('admin.overview.allPosts', {
                  defaultValue: 'All Posts',
                })}
                current={stats.posts.all.all}
                previous={
                  stats.posts.all.all - stats.posts.all.week.currentPeriod
                }
                text={t('admin.overview.lastWeek', {
                  defaultValue: 'Last Week',
                })}
              />
              <CommunityStatsCard
                title={t('admin.overview.jamSessions', {
                  defaultValue: 'Jam Sessions',
                })}
                current={stats.jams.sessions.all}
                previous={stats.jams.sessions.week.lastPeriod}
                text={t('admin.overview.lastWeek', {
                  defaultValue: 'Last Week',
                })}
              />
              <CommunityStatsCard
                title={t('admin.overview.jamParticipants', {
                  defaultValue: 'Jam Participants',
                })}
                current={stats.jams.participants.week.currentPeriod}
                previous={stats.jams.participants.week.lastPeriod}
                text={t('admin.overview.lastWeek', {
                  defaultValue: 'Last Week',
                })}
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
            <h2 className="mb-3 text-lg font-medium">
              {t('admin.overview.profilesSection', {
                defaultValue: 'Profiles',
              })}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card
                title={t('admin.overview.totalProfiles', {
                  defaultValue: 'Total Profiles',
                })}
                value={stats.profiles.all.all}
              />
              <Card
                title={t('admin.overview.activeMonth', {
                  defaultValue: 'Active (month)',
                })}
                value={stats.profiles.active.month.currentPeriod}
                hint={t('admin.overview.vsLastMonth', {
                  defaultValue: 'vs. {{count}} last month',
                  count: stats.profiles.active.month.lastPeriod,
                })}
              />
              <Card
                title={t('admin.overview.activeWeek', {
                  defaultValue: 'Active (week)',
                })}
                value={stats.profiles.active.week.currentPeriod}
              />
              <Card
                title={t('admin.overview.activeDay', {
                  defaultValue: 'Active (day)',
                })}
                value={stats.profiles.active.day.currentPeriod}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium">
              {t('admin.overview.postsSection', { defaultValue: 'Posts' })}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card
                title={t('admin.overview.allPosts', {
                  defaultValue: 'All Posts',
                })}
                value={stats.posts.all.all}
              />
              <Card
                title={t('admin.overview.replies', { defaultValue: 'Replies' })}
                value={stats.posts.replies.all}
              />
              <Card
                title={t('admin.overview.thisMonth', {
                  defaultValue: 'This month',
                })}
                value={stats.posts.all.month.currentPeriod}
              />
              <Card
                title={t('admin.overview.interactionsAll', {
                  defaultValue: 'Interactions (all)',
                })}
                value={stats.interactions.all.all}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium">
              {t('admin.overview.jamsSection', { defaultValue: 'Jams' })}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card
                title={t('admin.overview.sessions', {
                  defaultValue: 'Sessions',
                })}
                value={stats.jams.sessions.all}
              />
              <Card
                title={t('admin.overview.participants', {
                  defaultValue: 'Participants',
                })}
                value={stats.jams.participants.all}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};
