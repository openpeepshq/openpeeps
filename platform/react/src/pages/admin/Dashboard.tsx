import {
  AnalyticsLineChart,
  LoadingSpinner,
  MetricCard,
} from '@openpeepshq/react-ui';
import type { AnalyticsMetricCard } from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { useServerInfo } from '../../components';
import { AnalyticsSection } from './analytics/AnalyticsLayout';
import { ServerStatusSection } from './components/ServerStatusSection';

const WEEK = { preset: '7d' };

const deltaPct = (value: number, previous: number): number | null => {
  if (previous === 0) return value === 0 ? null : 100;
  return ((value - previous) / previous) * 100;
};

const sumMetrics = (metrics: AnalyticsMetricCard[]) => {
  const value = metrics.reduce((sum, metric) => sum + metric.value, 0);
  const previous = metrics.reduce(
    (sum, metric) => sum + metric.previousValue,
    0,
  );
  return { value, deltaPct: deltaPct(value, previous) };
};

export function AdminDashboard() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const serverInfo = useServerInfo();
  const overview = openpeepsApi.admin.useAnalyticsOverview(WEEK);
  const growth = openpeepsApi.admin.useAnalyticsGrowth(WEEK);
  const engagement = openpeepsApi.admin.useAnalyticsEngagement(WEEK);
  const statsQuery = openpeepsApi.admin.useGeneralStats();

  useSetPageHeader(
    t('admin.dashboard.title', { defaultValue: 'Administration' }),
  );

  const info = (key: string, defaultValue: string) =>
    t(`admin.analytics.info.${key}`, { defaultValue });
  const overviewInfo = (key: string, defaultValue: string) =>
    t(`admin.overview.info.${key}`, { defaultValue });

  if (
    overview.isLoading ||
    growth.isLoading ||
    engagement.isLoading ||
    statsQuery.isLoading
  ) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  const overviewData = overview.data;
  const growthData = growth.data;
  const engagementData = engagement.data;
  const stats = statsQuery.data;
  if (!overviewData || !growthData || !engagementData || !stats) {
    return (
      <div className="text-muted-foreground p-4 text-sm">
        {t('admin.overview.noStats', { defaultValue: 'No stats available' })}
      </div>
    );
  }

  const interactions = sumMetrics([
    engagementData.metrics.likes,
    engagementData.metrics.comments,
    engagementData.metrics.reposts,
    engagementData.metrics.bookmarks,
  ]);
  const thisPeriod = t('admin.analytics.period.thisPeriod', {
    defaultValue: 'This period',
  });
  const lastWeek = t('admin.overview.lastWeek', { defaultValue: 'Last Week' });
  const signups = growthData.signupsByDay.map((point) => ({
    label: point.day.slice(5),
    value: point.value,
  }));

  return (
    <div className="space-y-6 p-4">
      <ServerStatusSection status={serverInfo} host={stats.host} />

      <section>
        <h2 className="mb-3 text-lg font-medium">
          {t('admin.overview.communityOverview', {
            defaultValue: 'Community overview',
          })}
        </h2>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label={t('admin.overview.totalProfiles', {
              defaultValue: 'Total Profiles',
            })}
            value={overviewData.metrics.totalMembers.value}
            deltaPct={overviewData.metrics.totalMembers.deltaPct}
            subtitle={t('admin.analytics.period.allTime', {
              defaultValue: 'All-time',
            })}
            info={info(
              'totalMembers',
              'Count of non-deleted member profiles created on or before the end of the selected range (all-time cumulative).',
            )}
          />
          <MetricCard
            label={t('admin.overview.activeProfiles', {
              defaultValue: 'Active Profiles',
            })}
            value={overviewData.metrics.activeMembers.value}
            deltaPct={overviewData.metrics.activeMembers.deltaPct}
            subtitle={lastWeek}
            info={info(
              'activeMembers',
              'Distinct members who posted, liked, replied, reposted, or bookmarked at least once in the selected range. A member active on multiple days is counted once.',
            )}
          />
          <MetricCard
            label={t('admin.overview.recentInteractions', {
              defaultValue: 'Recent Interactions',
            })}
            value={interactions.value}
            deltaPct={interactions.deltaPct}
            subtitle={lastWeek}
            info={overviewInfo(
              'recentInteractions',
              'Likes, replies, reposts, and bookmarks recorded in the last seven days.',
            )}
          />
          <MetricCard
            label={t('admin.overview.allPosts', { defaultValue: 'All Posts' })}
            value={overviewData.metrics.allTimePosts.value}
            deltaPct={overviewData.metrics.allTimePosts.deltaPct}
            subtitle={t('admin.analytics.period.allTime', {
              defaultValue: 'All-time',
            })}
            info={info(
              'totalPostsAllTime',
              'All non-deleted, non-direct posts created on or before the end of the selected range.',
            )}
          />
          <MetricCard
            label={t('admin.overview.jamSessions', {
              defaultValue: 'Jam Sessions',
            })}
            value={stats.jams.sessions.all}
            deltaPct={deltaPct(
              stats.jams.sessions.all,
              stats.jams.sessions.week.lastPeriod,
            )}
            subtitle={lastWeek}
            info={overviewInfo(
              'jamSessions',
              'All-time jam sessions. Delta compares to jam sessions in the previous week.',
            )}
          />
          <MetricCard
            label={t('admin.overview.jamParticipants', {
              defaultValue: 'Jam Participants',
            })}
            value={stats.jams.participants.week.currentPeriod}
            deltaPct={deltaPct(
              stats.jams.participants.week.currentPeriod,
              stats.jams.participants.week.lastPeriod,
            )}
            subtitle={lastWeek}
            info={overviewInfo(
              'jamParticipants',
              'Distinct jam participants in the last seven days.',
            )}
          />
        </div>
      </section>

      <AnalyticsSection
        title={t('admin.overview.newSignups', { defaultValue: 'New signups' })}
        info={info(
          'signupsByDay',
          'New member profiles created on each calendar day in the selected range.',
        )}
      >
        <AnalyticsLineChart data={signups} height={220} />
      </AnalyticsSection>

      <section>
        <h2 className="mb-3 text-lg font-medium">
          {t('admin.overview.profilesSection', { defaultValue: 'Profiles' })}
        </h2>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label={t('admin.overview.totalProfiles', {
              defaultValue: 'Total Profiles',
            })}
            value={overviewData.metrics.totalMembers.value}
            info={info(
              'totalMembers',
              'Count of non-deleted member profiles created on or before the end of the selected range (all-time cumulative).',
            )}
          />
          <MetricCard
            label={t('admin.analytics.metrics.mau', { defaultValue: 'MAU' })}
            value={growthData.metrics.mau.value}
            deltaPct={growthData.metrics.mau.deltaPct}
            subtitle={t('admin.analytics.period.rolling30d', {
              defaultValue: 'Rolling 30 days',
            })}
            info={info(
              'mau',
              'Distinct members who posted, liked, replied, reposted, or bookmarked in the 30 days ending at the range end.',
            )}
          />
          <MetricCard
            label={t('admin.overview.activeWeek', {
              defaultValue: 'Active (week)',
            })}
            value={overviewData.metrics.activeMembers.value}
            deltaPct={overviewData.metrics.activeMembers.deltaPct}
            subtitle={thisPeriod}
            info={info(
              'activeMembers',
              'Distinct members who posted, liked, replied, reposted, or bookmarked at least once in the selected range. A member active on multiple days is counted once.',
            )}
          />
          <MetricCard
            label={t('admin.analytics.metrics.dau', { defaultValue: 'DAU' })}
            value={growthData.metrics.dau.value}
            deltaPct={growthData.metrics.dau.deltaPct}
            subtitle={thisPeriod}
            info={info(
              'dau',
              'Average daily active members in the selected range. Active means posted, liked, replied, reposted, or bookmarked that day.',
            )}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">
          {t('admin.overview.postsSection', { defaultValue: 'Posts' })}
        </h2>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label={t('admin.overview.allPosts', { defaultValue: 'All Posts' })}
            value={overviewData.metrics.allTimePosts.value}
            info={info(
              'totalPostsAllTime',
              'All non-deleted, non-direct posts created on or before the end of the selected range.',
            )}
          />
          <MetricCard
            label={t('admin.overview.replies', { defaultValue: 'Replies' })}
            value={engagementData.metrics.comments.value}
            deltaPct={engagementData.metrics.comments.deltaPct}
            subtitle={thisPeriod}
            info={info(
              'comments',
              'Replies recorded during the selected range.',
            )}
          />
          <MetricCard
            label={t('admin.overview.postsThisPeriod', {
              defaultValue: 'This week',
            })}
            value={overviewData.metrics.totalPosts.value}
            deltaPct={overviewData.metrics.totalPosts.deltaPct}
            subtitle={thisPeriod}
            info={info(
              'totalPostsPeriod',
              'Posts created during the selected range (excluding direct messages). Delta compares to the previous period.',
            )}
          />
          <MetricCard
            label={t('admin.overview.recentInteractions', {
              defaultValue: 'Recent Interactions',
            })}
            value={interactions.value}
            deltaPct={interactions.deltaPct}
            subtitle={thisPeriod}
            info={overviewInfo(
              'recentInteractions',
              'Likes, replies, reposts, and bookmarks recorded in the last seven days.',
            )}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">
          {t('admin.overview.jamsSection', { defaultValue: 'Jams' })}
        </h2>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label={t('admin.overview.sessions', { defaultValue: 'Sessions' })}
            value={stats.jams.sessions.all}
            info={overviewInfo('jamSessions', 'All-time jam sessions.')}
          />
          <MetricCard
            label={t('admin.overview.participants', {
              defaultValue: 'Participants',
            })}
            value={stats.jams.participants.all}
            info={overviewInfo(
              'jamParticipantsAll',
              'All-time jam participants.',
            )}
          />
        </div>
      </section>
    </div>
  );
}
