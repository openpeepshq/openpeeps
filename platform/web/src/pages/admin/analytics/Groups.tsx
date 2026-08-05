import {
  AnalyticsMultiLineChart,
  Table,
  type StackedSeries,
} from '@openpeeps/react-ui';
import type { AnalyticsGroupRow } from '@openpeeps/common/types';
import { useOpenpeeps, useT } from '@openpeeps/react';
import { AnalyticsLoading, AnalyticsSection } from './AnalyticsLayout';
import { useAnalyticsRangeContext } from './AnalyticsRangeContext';
import { columnHeader } from './analyticsInfo';

const GROWTH_COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#7c3aed',
];

const EngagementCell = ({ rate }: { rate: number }) => (
  <div className="flex min-w-[7rem] items-center gap-2">
    <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
      <div
        className="bg-foreground h-full rounded-full"
        style={{ width: `${Math.min(100, rate)}%` }}
      />
    </div>
    <span className="text-sm tabular-nums">{rate}%</span>
  </div>
);

const GrowthBadge = ({ growth }: { growth: number }) => (
  <span
    className={
      growth > 0
        ? 'rounded-md bg-emerald-50 px-2 py-0.5 text-sm tabular-nums text-emerald-700'
        : 'text-muted-foreground text-sm tabular-nums'
    }
  >
    {growth > 0 ? `+${growth}` : growth}
  </span>
);

const VisibilityBadge = ({
  visibility,
}: {
  visibility: AnalyticsGroupRow['visibility'];
}) => {
  const t = useT();
  const isPublic = visibility === 'public';
  return (
    <span
      className={
        isPublic
          ? 'inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
          : 'bg-muted text-muted-foreground inline-flex rounded-md px-2 py-0.5 text-xs font-medium'
      }
    >
      {isPublic
        ? t('admin.analytics.visibility.public', { defaultValue: 'Public' })
        : t('admin.analytics.visibility.private', { defaultValue: 'Private' })}
    </span>
  );
};

const cumulativeGrowthPoints = (
  points: Array<{ label: string; values: Record<string, number> }>,
  series: StackedSeries[],
) => {
  const running: Record<string, number> = Object.fromEntries(
    series.map((s) => [s.key, 0]),
  );
  return points.map((p) => {
    for (const s of series) {
      running[s.key] = (running[s.key] ?? 0) + (p.values[s.key] ?? 0);
    }
    const values = { ...running };
    return {
      label: p.label,
      value: Object.values(values).reduce((a, b) => a + b, 0),
      ...values,
    };
  });
};

export const AnalyticsGroupsPage = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { queryParams } = useAnalyticsRangeContext();
  const overview = openpeepsApi.admin.useAnalyticsOverview(queryParams);

  if (overview.isLoading) return <AnalyticsLoading />;
  if (overview.isError) {
    return (
      <p className="text-muted-foreground text-sm">
        Failed to load groups analytics.
      </p>
    );
  }
  const data = overview.data;
  if (!data) return <AnalyticsLoading />;

  const growthSeries: StackedSeries[] = data.groupGrowthSeries.map((s, i) => ({
    key: s.key,
    label: s.name,
    color: GROWTH_COLORS[i % GROWTH_COLORS.length]!,
  }));
  const growthChartData = cumulativeGrowthPoints(
    data.groupGrowthOverTime,
    growthSeries,
  );
  const info = (key: string, defaultValue: string) =>
    t(`admin.analytics.info.${key}`, { defaultValue });

  return (
    <div className="space-y-5">
      <AnalyticsSection
        title={t('admin.analytics.topGroupsByActivity', {
          defaultValue: 'Top Groups by Activity',
        })}
        info={info(
          'topGroupsByActivity',
          'Groups ranked by activity in the range: posts + likes + comments on group posts. Shows the top 6.',
        )}
      >
        {data.topGroups.length > 0 ? (
          <Table
            data={data.topGroups}
            columnDefinitions={[
              {
                id: 'group',
                type: 'text',
                header: columnHeader(
                  t('admin.analytics.table.groupName', {
                    defaultValue: 'Group name',
                  }),
                  info('tableGroupName', 'Group display name (or handle).'),
                ),
                render: (g: AnalyticsGroupRow) => (
                  <div className="flex flex-col items-start gap-1">
                    <span>{g.name ?? g.handle ?? g.groupId}</span>
                    <VisibilityBadge visibility={g.visibility} />
                  </div>
                ),
              },
              {
                id: 'members',
                type: 'text',
                header: columnHeader(
                  t('admin.analytics.table.members', {
                    defaultValue: 'Members',
                  }),
                  info(
                    'tableMembers',
                    'Current total members in the group, with active members underneath (distinct post authors in the group during the range).',
                  ),
                ),
                render: (g: AnalyticsGroupRow) => (
                  <div className="flex flex-col tabular-nums">
                    <span>{g.members.toLocaleString()}</span>
                    <span className="text-muted-foreground text-xs">
                      {g.activeMembers.toLocaleString()}{' '}
                      {t('admin.analytics.table.activeShort', {
                        defaultValue: 'active',
                      })}
                    </span>
                  </div>
                ),
              },
              {
                id: 'posts',
                type: 'property',
                header: columnHeader(
                  t('admin.analytics.metrics.totalPosts', {
                    defaultValue: 'Posts',
                  }),
                  info(
                    'tableGroupPosts',
                    'Posts published into the group during the selected range.',
                  ),
                ),
              },
              {
                id: 'engagement',
                type: 'text',
                header: columnHeader(
                  t('admin.analytics.table.engagement', {
                    defaultValue: 'Engagement',
                  }),
                  info(
                    'tableGroupEngagement',
                    '(Likes + comments) on group posts ÷ unique viewers of group posts in the range, as a percentage. Can exceed 100% when engagements outnumber viewers.',
                  ),
                ),
                render: (g: AnalyticsGroupRow) => (
                  <EngagementCell rate={g.engagementRate} />
                ),
              },
              {
                id: 'growth',
                type: 'text',
                header: columnHeader(
                  t('admin.analytics.table.growth', {
                    defaultValue: 'Growth',
                  }),
                  info(
                    'tableGroupGrowth',
                    'New memberships (joins) added to the group during the selected range.',
                  ),
                ),
                render: (g: AnalyticsGroupRow) => (
                  <GrowthBadge growth={g.growth} />
                ),
              },
            ]}
          />
        ) : (
          <p className="text-muted-foreground text-sm">No group data yet</p>
        )}
      </AnalyticsSection>

      <AnalyticsSection
        title={t('admin.analytics.groupGrowth', {
          defaultValue: 'Group Growth (New Members)',
        })}
        info={info(
          'groupGrowth',
          'Cumulative new group memberships (joins) over the range for the six groups with the largest membership growth. Each line is one group.',
        )}
      >
        {growthSeries.length > 0 ? (
          <div>
            <AnalyticsMultiLineChart
              data={growthChartData}
              series={growthSeries}
            />
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {growthSeries.map((s) => (
                <li
                  key={s.key}
                  className="text-muted-foreground flex items-center gap-2 text-sm"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  <span className="text-foreground">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No group membership growth in this period
          </p>
        )}
      </AnalyticsSection>
    </div>
  );
};
