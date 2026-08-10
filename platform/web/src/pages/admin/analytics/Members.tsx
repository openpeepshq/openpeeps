import { AnalyticsDayHeatmap, MetricCard, Table } from '@openpeepshq/react-ui';
import type { AnalyticsSignupRow } from '@openpeepshq/common/types';
import { useOpenpeeps, useT } from '@openpeepshq/react';
import { AnalyticsLoading, AnalyticsSection } from './AnalyticsLayout';
import { useAnalyticsRangeContext } from './AnalyticsRangeContext';
import { columnHeader } from './analyticsInfo';

const averageSeries = (
  series: Array<{ value: number }> | undefined,
): number => {
  if (!series?.length) return 0;
  return (
    Math.round(
      (series.reduce((acc, p) => acc + p.value, 0) / series.length) * 10,
    ) / 10
  );
};

export const AnalyticsMembersPage = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { queryParams } = useAnalyticsRangeContext();
  const overview = openpeepsApi.admin.useAnalyticsOverview(queryParams);
  const growth = openpeepsApi.admin.useAnalyticsGrowth(queryParams);

  if (overview.isLoading || growth.isLoading) return <AnalyticsLoading />;
  const overviewData = overview.data;
  const data = growth.data;
  if (overview.isError || growth.isError) {
    return (
      <p className="text-muted-foreground text-sm">
        Failed to load members analytics.
      </p>
    );
  }
  if (!overviewData || !data) return <AnalyticsLoading />;

  const thisPeriod = t('admin.analytics.period.thisPeriod', {
    defaultValue: 'This period',
  });
  const engagementRate = averageSeries(overviewData.engagementRateSeries);
  const info = (key: string, defaultValue: string) =>
    t(`admin.analytics.info.${key}`, { defaultValue });

  const signupsByDay = data.signupsByDay?.length
    ? data.signupsByDay
    : (data.metrics.newSignups.series ?? []).map((p) => ({
        day: p.day,
        value: p.value,
      }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('admin.analytics.metrics.totalMembers', {
            defaultValue: 'Total members',
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
          label={t('admin.analytics.metrics.newMembers', {
            defaultValue: 'New members',
          })}
          value={data.metrics.newSignups.value}
          deltaPct={data.metrics.newSignups.deltaPct}
          subtitle={thisPeriod}
          info={info(
            'newMembers',
            'Profiles created during the selected range. Delta compares to the previous period of the same length.',
          )}
        />
        <MetricCard
          label={t('admin.analytics.metrics.activeMembers', {
            defaultValue: 'Active members',
          })}
          value={overviewData.metrics.activeMembers.value}
          deltaPct={overviewData.metrics.activeMembers.deltaPct}
          subtitle={thisPeriod}
          info={info(
            'activeMembers',
            'Distinct members who were active on at least one day in the range, summed from daily active-member rollups.',
          )}
        />
        <MetricCard
          label={t('admin.analytics.engagementRate', {
            defaultValue: 'Engagement rate',
          })}
          value={`${engagementRate}%`}
          subtitle={thisPeriod}
          info={info(
            'engagementRateMembers',
            'Average of the daily engagement-rate series for the range. Each day is (likes + comments) / posts that day, as a percentage.',
          )}
        />
      </div>

      <AnalyticsSection
        title={t('admin.analytics.signupsByDay', {
          defaultValue: 'Signups by day',
        })}
        info={info(
          'signupsByDay',
          'New member profiles created on each calendar day in the selected range. Darker cells mean more signups.',
        )}
      >
        <AnalyticsDayHeatmap data={signupsByDay} />
      </AnalyticsSection>

      <AnalyticsSection
        collapsible
        title={t('admin.analytics.recentSignups', {
          defaultValue: 'Recent signups',
        })}
        info={info(
          'recentSignups',
          'Most recent member profiles created in the selected range, with signup channel when known.',
        )}
      >
        {data.recentSignups.length > 0 ? (
          <Table
            data={data.recentSignups}
            columnDefinitions={[
              {
                id: 'member',
                type: 'text',
                header: columnHeader(
                  t('admin.analytics.table.member', {
                    defaultValue: 'Member',
                  }),
                  info(
                    'tableMember',
                    'Display name (or handle) of the member.',
                  ),
                ),
                render: (s: AnalyticsSignupRow) =>
                  `${s.displayName || `@${s.handle}`} (@${s.handle})`,
              },
              {
                id: 'channel',
                type: 'property',
                header: columnHeader(
                  t('admin.analytics.table.channel', {
                    defaultValue: 'Channel',
                  }),
                  info(
                    'tableChannel',
                    'Signup channel recorded for the member (for example invite or organic), when known.',
                  ),
                ),
              },
              {
                id: 'joined',
                type: 'text',
                header: columnHeader(
                  t('admin.analytics.table.joined', {
                    defaultValue: 'Date joined',
                  }),
                  info(
                    'tableDateJoined',
                    'Date the member profile was created.',
                  ),
                ),
                render: (s: AnalyticsSignupRow) =>
                  new Date(s.joinedAt).toLocaleDateString(),
              },
            ]}
          />
        ) : (
          <p className="text-muted-foreground text-sm">No signups in range</p>
        )}
      </AnalyticsSection>
    </div>
  );
};
