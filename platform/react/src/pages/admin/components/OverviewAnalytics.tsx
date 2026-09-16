import { AnalyticsBarChart, MetricCard } from '@openpeepshq/react-ui';
import { useOpenpeeps, useT } from '../../../index';
import {
  AnalyticsLoading,
  AnalyticsSection,
} from '../analytics/AnalyticsLayout';

const WEEK = { preset: '7d' };
const MONTH = { preset: '30d' };

export const OverviewAnalytics = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const weekOverview = openpeepsApi.admin.useAnalyticsOverview(WEEK);
  const monthOverview = openpeepsApi.admin.useAnalyticsOverview(MONTH);
  const growth = openpeepsApi.admin.useAnalyticsGrowth(WEEK);

  const loading =
    weekOverview.isLoading || monthOverview.isLoading || growth.isLoading;
  const week = weekOverview.data;
  const month = monthOverview.data;
  const growthData = growth.data;

  if (loading) return <AnalyticsLoading />;
  if (!week || !month || !growthData) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('admin.overview.noStats', { defaultValue: 'No stats available' })}
      </p>
    );
  }

  const lastWeek = t('admin.overview.lastWeek', { defaultValue: 'Last Week' });
  const allTime = t('admin.analytics.period.allTime', {
    defaultValue: 'All-time',
  });
  const thisMonth = t('admin.overview.thisMonth', {
    defaultValue: 'This month',
  });
  const info = (key: string, defaultValue: string) =>
    t(`admin.overview.info.${key}`, { defaultValue });
  const analyticsInfo = (key: string, defaultValue: string) =>
    t(`admin.analytics.info.${key}`, { defaultValue });

  const signups = (
    growthData.signupsByDay?.length
      ? growthData.signupsByDay
      : (growthData.metrics.newSignups.series ?? [])
  ).map((p) => ({
    label: p.day.slice(5),
    value: p.value,
  }));

  return (
    <>
      <section>
        <h2 className="mb-3 text-lg font-medium">
          {t('admin.overview.communityOverview', {
            defaultValue: 'Community overview',
          })}
        </h2>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label={t('admin.overview.totalProfiles', {
              defaultValue: 'Total Profiles',
            })}
            value={week.metrics.totalMembers.value}
            deltaPct={week.metrics.totalMembers.deltaPct}
            subtitle={allTime}
            info={analyticsInfo(
              'totalMembers',
              'Count of non-deleted member profiles created on or before the end of the selected range (all-time cumulative).',
            )}
          />
          <MetricCard
            label={t('admin.overview.activeProfiles', {
              defaultValue: 'Active Profiles',
            })}
            value={week.metrics.activeMembers.value}
            deltaPct={week.metrics.activeMembers.deltaPct}
            subtitle={lastWeek}
            info={analyticsInfo(
              'activeMembers',
              'Distinct members who were active on at least one day in the range, summed from daily active-member rollups.',
            )}
          />
          <MetricCard
            label={t('admin.overview.recentInteractions', {
              defaultValue: 'Recent Interactions',
            })}
            value={week.metrics.interactions.value}
            deltaPct={week.metrics.interactions.deltaPct}
            subtitle={lastWeek}
            info={info(
              'recentInteractions',
              'Likes, replies, reposts, and bookmarks recorded in the last 7 days.',
            )}
          />
          <MetricCard
            label={t('admin.overview.allPosts', {
              defaultValue: 'All Posts',
            })}
            value={week.metrics.allTimePosts.value}
            deltaPct={week.metrics.allTimePosts.deltaPct}
            subtitle={allTime}
            info={analyticsInfo(
              'totalPostsAllTime',
              'All non-deleted, non-direct posts created on or before the end of the selected range.',
            )}
          />
          <MetricCard
            label={t('admin.overview.jamSessions', {
              defaultValue: 'Jam Sessions',
            })}
            value={week.metrics.allTimeJamSessions.value}
            deltaPct={week.metrics.allTimeJamSessions.deltaPct}
            subtitle={allTime}
            info={info(
              'jamSessions',
              'Jam sessions started on or before the end of the range. Delta compares to the previous period.',
            )}
          />
          <MetricCard
            label={t('admin.overview.jamParticipants', {
              defaultValue: 'Jam Participants',
            })}
            value={week.metrics.jamParticipants.value}
            deltaPct={week.metrics.jamParticipants.deltaPct}
            subtitle={lastWeek}
            info={info(
              'jamParticipants',
              'Jam join events recorded in the last 7 days.',
            )}
          />
        </div>
      </section>

      <AnalyticsSection
        title={t('admin.overview.newSignups', {
          defaultValue: 'New signups',
        })}
        info={analyticsInfo(
          'signupsByDay',
          'New member profiles created on each calendar day in the selected range.',
        )}
      >
        <AnalyticsBarChart data={signups} />
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
            value={week.metrics.totalMembers.value}
            deltaPct={week.metrics.totalMembers.deltaPct}
            subtitle={allTime}
            info={analyticsInfo(
              'totalMembers',
              'Count of non-deleted member profiles created on or before the end of the selected range (all-time cumulative).',
            )}
          />
          <MetricCard
            label={t('admin.overview.activeMonth', {
              defaultValue: 'Active (month)',
            })}
            value={growthData.metrics.mau.value}
            deltaPct={growthData.metrics.mau.deltaPct}
            subtitle={t('admin.analytics.period.rolling30d', {
              defaultValue: 'Rolling 30 days',
            })}
            info={analyticsInfo(
              'mau',
              'Distinct members who posted, liked, replied, reposted, or bookmarked in the 30 days ending at the range end.',
            )}
          />
          <MetricCard
            label={t('admin.overview.activeWeek', {
              defaultValue: 'Active (week)',
            })}
            value={week.metrics.activeMembers.value}
            deltaPct={week.metrics.activeMembers.deltaPct}
            subtitle={lastWeek}
            info={analyticsInfo(
              'activeMembers',
              'Distinct members who were active on at least one day in the range, summed from daily active-member rollups.',
            )}
          />
          <MetricCard
            label={t('admin.overview.activeDay', {
              defaultValue: 'Active (day)',
            })}
            value={growthData.metrics.dau.value}
            deltaPct={growthData.metrics.dau.deltaPct}
            subtitle={t('admin.analytics.metrics.dau', { defaultValue: 'DAU' })}
            info={analyticsInfo(
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
            value={week.metrics.allTimePosts.value}
            deltaPct={week.metrics.allTimePosts.deltaPct}
            subtitle={allTime}
            info={analyticsInfo(
              'totalPostsAllTime',
              'All non-deleted, non-direct posts created on or before the end of the selected range.',
            )}
          />
          <MetricCard
            label={t('admin.overview.replies', { defaultValue: 'Replies' })}
            value={week.metrics.allTimeReplies.value}
            deltaPct={week.metrics.replies.deltaPct}
            subtitle={allTime}
            info={info(
              'replies',
              'All-time replies. Delta is replies in the last 7 days versus the previous week.',
            )}
          />
          <MetricCard
            label={t('admin.overview.thisMonth', {
              defaultValue: 'This month',
            })}
            value={month.metrics.totalPosts.value}
            deltaPct={month.metrics.totalPosts.deltaPct}
            subtitle={thisMonth}
            info={analyticsInfo(
              'totalPostsPeriod',
              'Posts created during the selected range (excluding direct messages). Delta compares to the previous period.',
            )}
          />
          <MetricCard
            label={t('admin.overview.interactionsAll', {
              defaultValue: 'Interactions (all)',
            })}
            value={week.metrics.allTimeInteractions.value}
            deltaPct={week.metrics.allTimeInteractions.deltaPct}
            subtitle={allTime}
            info={info(
              'interactionsAll',
              'All-time likes, replies, reposts, and bookmarks from compiled analytics.',
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
            value={week.metrics.allTimeJamSessions.value}
            deltaPct={week.metrics.allTimeJamSessions.deltaPct}
            subtitle={allTime}
            info={info(
              'jamSessionsAll',
              'Jam sessions started on or before the end of the range, from compiled analytics.',
            )}
          />
          <MetricCard
            label={t('admin.overview.participants', {
              defaultValue: 'Participants',
            })}
            value={week.metrics.allTimeJamParticipants.value}
            deltaPct={week.metrics.allTimeJamParticipants.deltaPct}
            subtitle={allTime}
            info={info(
              'jamParticipantsAll',
              'Jam join events on or before the end of the range, from compiled analytics.',
            )}
          />
        </div>
      </section>
    </>
  );
};
