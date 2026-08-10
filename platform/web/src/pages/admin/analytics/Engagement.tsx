import { useMemo, useState } from 'react';
import {
  AnalyticsBarChart,
  AnalyticsMultiLineChart,
  AnalyticsStackedAreaChart,
  MetricCard,
  type StackedSeries,
} from '@openpeepshq/react-ui';
import { useOpenpeeps, useT } from '@openpeepshq/react';
import { AnalyticsLoading, AnalyticsSection } from './AnalyticsLayout';
import { useAnalyticsRangeContext } from './AnalyticsRangeContext';

type OverTimeMetric = 'all' | 'likes' | 'reposts' | 'bookmarks' | 'comments';

const OVER_TIME_SERIES: StackedSeries[] = [
  { key: 'likes', label: 'Likes', color: '#111827' },
  { key: 'reposts', label: 'Shares', color: '#4b5563' },
  { key: 'bookmarks', label: 'Bookmarks', color: '#6b7280' },
  { key: 'comments', label: 'Replies', color: '#9ca3af' },
];

const ratePct = (numerator: number, denominator: number) =>
  denominator <= 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10;

const EngagementRateBreakdown = ({
  likes,
  shares,
  bookmarks,
  comments,
  views,
  overallLabel,
  overallHelp,
}: {
  likes: number;
  shares: number;
  bookmarks: number;
  comments: number;
  views: number;
  overallLabel: string;
  overallHelp: string;
}) => {
  const t = useT();
  const rows = [
    {
      key: 'like',
      label: t('admin.analytics.rates.like', { defaultValue: 'Like rate' }),
      pct: ratePct(likes, views),
      color: '#111827',
    },
    {
      key: 'share',
      label: t('admin.analytics.rates.share', { defaultValue: 'Share rate' }),
      pct: ratePct(shares, views),
      color: '#4b5563',
    },
    {
      key: 'bookmark',
      label: t('admin.analytics.rates.bookmark', {
        defaultValue: 'Bookmark rate',
      }),
      pct: ratePct(bookmarks, views),
      color: '#6b7280',
    },
    {
      key: 'comment',
      label: t('admin.analytics.rates.comment', {
        defaultValue: 'Comment rate',
      }),
      pct: ratePct(comments, views),
      color: '#9ca3af',
    },
  ];
  const overall = ratePct(likes + shares + bookmarks + comments, views);
  const maxPct = Math.max(1, ...rows.map((r) => r.pct), overall);

  return (
    <div className="space-y-5">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>{row.label}</span>
            <span className="text-2xl font-medium tabular-nums">
              {row.pct}%
            </span>
          </div>
          <div className="bg-muted h-3 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(row.pct / maxPct) * 100}%`,
                backgroundColor: row.color,
              }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-start justify-between border-t pt-4">
        <div>
          <div className="text-sm font-medium">{overallLabel}</div>
          <div className="text-muted-foreground text-xs">{overallHelp}</div>
        </div>
        <div className="text-3xl font-semibold tabular-nums">{overall}%</div>
      </div>
    </div>
  );
};

export const AnalyticsEngagementPage = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { queryParams } = useAnalyticsRangeContext();
  const query = openpeepsApi.admin.useAnalyticsEngagement(queryParams);
  const [metricFilter, setMetricFilter] = useState<OverTimeMetric>('all');

  const filterOptions = useMemo(
    () =>
      [
        {
          value: 'all' as const,
          label: t('admin.analytics.filters.allMetrics', {
            defaultValue: 'All metrics',
          }),
        },
        {
          value: 'likes' as const,
          label: t('admin.analytics.metrics.likes', { defaultValue: 'Likes' }),
        },
        {
          value: 'reposts' as const,
          label: t('admin.analytics.metrics.reposts', {
            defaultValue: 'Shares',
          }),
        },
        {
          value: 'bookmarks' as const,
          label: t('admin.analytics.metrics.bookmarks', {
            defaultValue: 'Bookmarks',
          }),
        },
        {
          value: 'comments' as const,
          label: t('admin.analytics.metrics.comments', {
            defaultValue: 'Replies',
          }),
        },
      ] as const,
    [t],
  );

  if (query.isLoading) return <AnalyticsLoading />;
  const data = query.data;
  if (query.isError) {
    return (
      <p className="text-muted-foreground text-sm">
        Failed to load engagement analytics.
      </p>
    );
  }
  if (!data) return <AnalyticsLoading />;

  const overTimeSeries =
    metricFilter === 'all'
      ? OVER_TIME_SERIES
      : OVER_TIME_SERIES.filter((s) => s.key === metricFilter);

  const overTimeData = data.engagementOverTime.map((p) => ({
    label: p.label,
    value: p.likes + p.comments + p.reposts + p.bookmarks,
    likes: p.likes,
    comments: p.comments,
    reposts: p.reposts,
    bookmarks: p.bookmarks,
  }));

  const metricInfo: Record<string, string> = {
    likes: t('admin.analytics.info.likes', {
      defaultValue: 'Reaction likes recorded during the selected range.',
    }),
    comments: t('admin.analytics.info.comments', {
      defaultValue: 'Replies recorded during the selected range.',
    }),
    reposts: t('admin.analytics.info.reposts', {
      defaultValue: 'Reposts (shares) recorded during the selected range.',
    }),
    bookmarks: t('admin.analytics.info.bookmarks', {
      defaultValue: 'Bookmarks recorded during the selected range.',
    }),
    dms: t('admin.analytics.info.dms', {
      defaultValue: 'Direct-message posts created during the selected range.',
    }),
    uniqueViewers: t('admin.analytics.info.uniqueViewers', {
      defaultValue:
        'Sum of daily unique post viewers across the range (a person viewing on multiple days can count more than once).',
    }),
    impressions: t('admin.analytics.info.impressions', {
      defaultValue:
        'Total post view events (impressions) during the selected range.',
    }),
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ['likes', data.metrics.likes],
            ['comments', data.metrics.comments],
            ['reposts', data.metrics.reposts],
            ['bookmarks', data.metrics.bookmarks],
            ['dms', data.metrics.dms],
            ['uniqueViewers', data.metrics.uniqueViewers],
            ['impressions', data.metrics.impressions],
          ] as const
        ).map(([key, metric]) => (
          <MetricCard
            key={key}
            label={t(`admin.analytics.metrics.${key}`, {
              defaultValue: key,
            })}
            value={metric.value}
            deltaPct={metric.deltaPct}
            subtitle={t('admin.analytics.period.thisPeriod', {
              defaultValue: 'This period',
            })}
            info={metricInfo[key]}
          />
        ))}
      </div>

      <AnalyticsSection
        title={t('admin.analytics.engagementOverTime', {
          defaultValue: 'Engagement over time',
        })}
        info={t('admin.analytics.info.engagementOverTime', {
          defaultValue:
            'Likes, shares (reposts), bookmarks, and replies aggregated into each time bucket. "All metrics" stacks them together.',
        })}
      >
        <div className="mb-3">
          <label className="sr-only" htmlFor="engagement-metric-filter">
            {t('admin.analytics.filters.allMetrics', {
              defaultValue: 'All metrics',
            })}
          </label>
          <select
            id="engagement-metric-filter"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            value={metricFilter}
            onChange={(e) => setMetricFilter(e.target.value as OverTimeMetric)}
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {metricFilter === 'all' ? (
          <AnalyticsStackedAreaChart
            data={overTimeData}
            series={overTimeSeries}
            height={320}
          />
        ) : (
          <AnalyticsMultiLineChart
            data={overTimeData}
            series={overTimeSeries}
            height={320}
          />
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {overTimeSeries.map((s) => (
            <span
              key={s.key}
              className="text-muted-foreground inline-flex items-center gap-1.5"
            >
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title={t('admin.analytics.viewsByPeriod', {
          defaultValue: 'Views/impressions by period',
        })}
        info={t('admin.analytics.info.viewsByPeriod', {
          defaultValue:
            'Post view events (impressions) summed into each time bucket of the range.',
        })}
      >
        <AnalyticsBarChart
          data={data.impressionsByPeriod.map((p) => ({
            label: p.label,
            value: p.value,
          }))}
          height={280}
        />
      </AnalyticsSection>

      <AnalyticsSection
        title={t('admin.analytics.engagementRateBreakdown', {
          defaultValue: 'Engagement rate breakdown',
        })}
        info={t('admin.analytics.info.engagementRateBreakdown', {
          defaultValue:
            'Per-action rates for the range: each action count divided by impressions, as a percentage. Overall = (likes + shares + bookmarks + comments) / impressions.',
        })}
      >
        <EngagementRateBreakdown
          likes={data.metrics.likes.value}
          shares={data.metrics.reposts.value}
          bookmarks={data.metrics.bookmarks.value}
          comments={data.metrics.comments.value}
          views={data.metrics.impressions.value}
          overallLabel={t('admin.analytics.overallEngagementRate', {
            defaultValue: 'Overall engagement rate',
          })}
          overallHelp={t('admin.analytics.overallEngagementHelp', {
            defaultValue: '(Likes + Shares + Bookmarks + Comments) / Views',
          })}
        />
      </AnalyticsSection>
    </div>
  );
};
