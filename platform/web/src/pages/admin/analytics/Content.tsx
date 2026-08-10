import { AnalyticsBarChart, MetricCard } from '@openpeepshq/react-ui';
import type { AnalyticsPostTypeKey } from '@openpeepshq/common/types';
import { useOpenpeeps, useT } from '@openpeepshq/react';
import { AnalyticsLoading, AnalyticsSection } from './AnalyticsLayout';
import { useAnalyticsRangeContext } from './AnalyticsRangeContext';

const POST_TYPE_META: Array<{
  key: AnalyticsPostTypeKey;
  label: string;
  color: string;
}> = [
  { key: 'event', label: 'Events', color: '#6b7280' },
  { key: 'jam', label: 'Jams', color: '#111827' },
  { key: 'article', label: 'Articles', color: '#4b5563' },
  { key: 'note', label: 'Notes', color: '#9ca3af' },
  { key: 'poll', label: 'Polls', color: '#d1d5db' },
];

const utcDayCount = (from: string, to: string) => {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 1;
  }
  return Math.round((end - start) / 86_400_000) + 1;
};

const ContentDistribution = ({
  items,
  totalLabel,
}: {
  items: Array<{ type: AnalyticsPostTypeKey; count: number }>;
  totalLabel: string;
}) => {
  const sum = items.reduce((acc, item) => acc + item.count, 0);
  const total = Math.max(1, sum);
  const byType = Object.fromEntries(
    items.map((i) => [i.type, i.count]),
  ) as Record<AnalyticsPostTypeKey, number>;
  const rows = POST_TYPE_META.map((meta) => {
    const count = byType[meta.key] ?? 0;
    return {
      ...meta,
      count,
      pct: Math.round((count / total) * 1000) / 10,
    };
  }).filter((row) => row.count > 0);

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block size-4 rounded-sm"
                style={{ backgroundColor: row.color }}
                aria-hidden
              />
              {row.label}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {row.count.toLocaleString()}
              <span className="ml-3 inline-block w-12 text-right">
                {row.pct}%
              </span>
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(row.count / total) * 100}%`,
                backgroundColor: row.color,
              }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between border-t pt-4 text-sm font-medium">
        <span>{totalLabel}</span>
        <span className="text-2xl tabular-nums">{sum.toLocaleString()}</span>
      </div>
    </div>
  );
};

export const AnalyticsContentPage = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { queryParams } = useAnalyticsRangeContext();
  const overview = openpeepsApi.admin.useAnalyticsOverview(queryParams);

  if (overview.isLoading) return <AnalyticsLoading />;
  const data = overview.data;
  if (overview.isError) {
    return (
      <p className="text-muted-foreground text-sm">
        Failed to load content analytics.
      </p>
    );
  }
  if (!data) return <AnalyticsLoading />;

  const thisPeriod = t('admin.analytics.period.thisPeriod', {
    defaultValue: 'This period',
  });
  const postsThisPeriod = data.metrics.totalPosts.value;
  const days = utcDayCount(data.range.from, data.range.to);
  const avgPostsPerDay = Math.round((postsThisPeriod / days) * 10) / 10;

  const postsByPeriod = data.postsOverTime.map((p) => ({
    label: p.label,
    value: p.jam + p.article + p.note + p.poll + p.event,
  }));
  const info = (key: string, defaultValue: string) =>
    t(`admin.analytics.info.${key}`, { defaultValue });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label={t('admin.analytics.metrics.totalPosts', {
            defaultValue: 'Total posts',
          })}
          value={data.metrics.allTimePosts.value}
          deltaPct={data.metrics.allTimePosts.deltaPct}
          subtitle={t('admin.analytics.period.allTime', {
            defaultValue: 'All-time',
          })}
          info={info(
            'totalPostsAllTime',
            'All non-deleted, non-direct posts created on or before the end of the selected range.',
          )}
        />
        <MetricCard
          label={t('admin.analytics.metrics.postsThisPeriod', {
            defaultValue: 'Posts this period',
          })}
          value={postsThisPeriod}
          deltaPct={data.metrics.totalPosts.deltaPct}
          subtitle={thisPeriod}
          info={info(
            'postsThisPeriod',
            'Posts created during the selected range (excluding direct messages).',
          )}
        />
        <MetricCard
          label={t('admin.analytics.metrics.avgPostsPerDay', {
            defaultValue: 'Avg posts per day',
          })}
          value={avgPostsPerDay}
          subtitle={thisPeriod}
          info={info(
            'avgPostsPerDay',
            'Posts created in the selected range divided by the number of calendar days in the range.',
          )}
        />
      </div>

      <AnalyticsSection
        title={t('admin.analytics.postsByPeriod', {
          defaultValue: 'Posts by period',
        })}
        info={info(
          'postsByPeriod',
          'Total posts created in each time bucket of the selected range.',
        )}
      >
        <AnalyticsBarChart data={postsByPeriod} />
      </AnalyticsSection>

      <AnalyticsSection
        title={t('admin.analytics.contentDistribution', {
          defaultValue: 'Content distribution',
        })}
        info={info(
          'contentDistribution',
          'Share of posts in the range by type (events, jams, articles, notes, polls).',
        )}
      >
        <ContentDistribution
          items={data.postTypes}
          totalLabel={t('admin.analytics.totalContentItems', {
            defaultValue: 'Total content items',
          })}
        />
      </AnalyticsSection>
    </div>
  );
};
