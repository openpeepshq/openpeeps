import {
  AnalyticsLineChart,
  AnalyticsStackedBarChart,
  MetricCard,
  Table,
} from '@openpeepshq/react-ui';
import type {
  AnalyticsMemberRow,
  AnalyticsPostRow,
  AnalyticsPostTypeKey,
} from '@openpeepshq/common/types';
import { useOpenpeeps, useT } from '../../../index';
import { AnalyticsLoading, AnalyticsSection } from './AnalyticsLayout';
import { useAnalyticsRangeContext } from './AnalyticsRangeContext';
import { columnHeader } from './analyticsInfo';

const POST_TYPE_SERIES: Array<{
  key: AnalyticsPostTypeKey;
  label: string;
  color: string;
}> = [
  { key: 'jam', label: 'Jams', color: '#111827' },
  { key: 'article', label: 'Articles', color: '#4b5563' },
  { key: 'note', label: 'Notes', color: '#9ca3af' },
  { key: 'poll', label: 'Polls', color: '#d1d5db' },
  { key: 'event', label: 'Events', color: '#6b7280' },
];

const PostTypesList = ({
  items,
}: {
  items: Array<{ type: AnalyticsPostTypeKey; count: number }>;
}) => {
  const max = Math.max(1, ...items.map((i) => i.count));
  const colors = Object.fromEntries(
    POST_TYPE_SERIES.map((s) => [s.key, s.color]),
  ) as Record<AnalyticsPostTypeKey, string>;
  const labels = Object.fromEntries(
    POST_TYPE_SERIES.map((s) => [s.key, s.label]),
  ) as Record<AnalyticsPostTypeKey, string>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.type}>
          <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
            <span>{labels[item.type]}</span>
            <span className="tabular-nums">{item.count.toLocaleString()}</span>
          </div>
          <div className="bg-surface h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.count / max) * 100}%`,
                backgroundColor: colors[item.type],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const AnalyticsOverviewPage = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { queryParams } = useAnalyticsRangeContext();
  const query = openpeepsApi.admin.useAnalyticsOverview(queryParams);

  if (query.isLoading) return <AnalyticsLoading />;
  const data = query.data;
  if (!data) return null;

  const stackedData = data.postsOverTime.map((p) => ({
    label: p.label,
    value: p.jam + p.article + p.note + p.poll + p.event,
    jam: p.jam,
    article: p.article,
    note: p.note,
    poll: p.poll,
    event: p.event,
  }));

  const activeUsersChart = data.activeUsersSeries.map((p) => ({
    label: p.label,
    value: p.value,
  }));

  const info = (key: string, defaultValue: string) =>
    t(`admin.analytics.info.${key}`, { defaultValue });

  return (
    <div className="min-w-0 space-y-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('admin.analytics.metrics.totalPosts', {
            defaultValue: 'Total posts',
          })}
          value={data.metrics.totalPosts.value}
          deltaPct={data.metrics.totalPosts.deltaPct}
          subtitle={t('admin.analytics.period.thisPeriod', {
            defaultValue: 'This period',
          })}
          info={info(
            'totalPostsPeriod',
            'Posts created during the selected range (excluding direct messages). Delta compares to the previous period.',
          )}
        />
        <MetricCard
          label={t('admin.analytics.metrics.totalMembers', {
            defaultValue: 'Total members',
          })}
          value={data.metrics.totalMembers.value}
          deltaPct={data.metrics.totalMembers.deltaPct}
          subtitle={t('admin.analytics.period.allTime', {
            defaultValue: 'All-time',
          })}
          info={info(
            'totalMembers',
            'Count of non-deleted member profiles created on or before the end of the selected range (all-time cumulative).',
          )}
        />
        <MetricCard
          label={t('admin.analytics.metrics.activeMembers', {
            defaultValue: 'Active members',
          })}
          value={data.metrics.activeMembers.value}
          deltaPct={data.metrics.activeMembers.deltaPct}
          subtitle={t('admin.analytics.period.thisPeriod', {
            defaultValue: 'This period',
          })}
          info={info(
            'activeMembers',
            'Distinct members who were active on at least one day in the range, summed from daily active-member rollups.',
          )}
        />
        <MetricCard
          label={t('admin.analytics.metrics.totalGroups', {
            defaultValue: 'Total groups',
          })}
          value={data.metrics.totalGroups.value}
          deltaPct={data.metrics.totalGroups.deltaPct}
          subtitle={t('admin.analytics.period.allTime', {
            defaultValue: 'All-time',
          })}
          info={info(
            'totalGroups',
            'Count of non-deleted groups existing on or before the end of the selected range.',
          )}
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <AnalyticsSection
          className="lg:col-span-2"
          title={t('admin.analytics.postsOverTime', {
            defaultValue: 'Posts made over time',
          })}
          info={info(
            'postsOverTime',
            'Posts created in each time bucket of the range, stacked by type (jams, articles, notes, polls, events).',
          )}
          csvFilename="posts-over-time.csv"
          csvRows={[
            ['bucket', 'label', 'jam', 'article', 'note', 'poll', 'event'],
            ...data.postsOverTime.map((p) => [
              p.day,
              p.label,
              p.jam,
              p.article,
              p.note,
              p.poll,
              p.event,
            ]),
          ]}
        >
          <AnalyticsStackedBarChart
            data={stackedData}
            series={POST_TYPE_SERIES}
          />
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {POST_TYPE_SERIES.map((s) => (
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
          title={t('admin.analytics.postTypes', {
            defaultValue: 'Post types',
          })}
          info={info(
            'postTypes',
            'Total posts in the range broken down by type.',
          )}
          csvFilename="post-types.csv"
          csvRows={[
            ['type', 'count'],
            ...data.postTypes.map((p) => [p.type, p.count]),
          ]}
        >
          <PostTypesList items={data.postTypes} />
        </AnalyticsSection>
      </div>

      <AnalyticsSection
        title={t('admin.analytics.activeUsers', {
          defaultValue: 'Active users',
        })}
        info={info(
          'activeUsers',
          'Active members per time bucket in the selected range.',
        )}
        csvFilename="active-users.csv"
        csvRows={[
          ['bucket', 'label', 'active_members'],
          ...data.activeUsersSeries.map((p) => [p.day, p.label, p.value]),
        ]}
      >
        <AnalyticsLineChart data={activeUsersChart} />
      </AnalyticsSection>

      <div className="min-w-0 space-y-4">
        <AnalyticsSection
          collapsible
          title={t('admin.analytics.topMembers', {
            defaultValue: 'Top members',
          })}
          info={info(
            'topMembers',
            'Members ranked by contributions in the range: posts created plus reactions and replies given.',
          )}
          csvFilename="top-members.csv"
          csvRows={[
            ['handle', 'display_name', 'role', 'joined_at', 'contributions'],
            ...data.topMembers.map((m) => [
              m.handle,
              m.displayName ?? '',
              m.role ?? '',
              m.joinedAt,
              m.contributions,
            ]),
          ]}
        >
          {data.topMembers.length > 0 ? (
            <Table
              data={data.topMembers}
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
                  render: (m: AnalyticsMemberRow) => m.displayName ?? m.handle,
                },
                {
                  id: 'role',
                  type: 'text',
                  header: columnHeader(
                    t('admin.analytics.table.role', { defaultValue: 'Role' }),
                    info(
                      'tableRole',
                      'Primary community or group role for the member when available.',
                    ),
                  ),
                  render: (m: AnalyticsMemberRow) => m.role ?? 'member',
                },
                {
                  id: 'joinedAt',
                  type: 'text',
                  header: columnHeader(
                    t('admin.analytics.table.dateJoined', {
                      defaultValue: 'Date joined',
                    }),
                    info(
                      'tableDateJoined',
                      'Date the member profile was created.',
                    ),
                  ),
                  render: (m: AnalyticsMemberRow) => m.joinedAt.slice(0, 10),
                },
                {
                  id: 'contributions',
                  type: 'property',
                  header: columnHeader(
                    t('admin.analytics.table.contributions', {
                      defaultValue: 'Contributions',
                    }),
                    info(
                      'tableContributions',
                      'Posts created plus reactions and replies given by the member in the selected range.',
                    ),
                  ),
                },
              ]}
            />
          ) : (
            <p className="text-muted-foreground text-sm">No data yet</p>
          )}
        </AnalyticsSection>

        <AnalyticsSection
          collapsible
          title={t('admin.analytics.topPosts', { defaultValue: 'Top posts' })}
          info={info(
            'topPosts',
            'Posts with the most unique viewers in the selected range.',
          )}
          csvFilename="top-posts.csv"
          csvRows={[
            ['post_id', 'snippet', 'creator', 'type', 'unique_viewers'],
            ...data.topPosts.map((p) => [
              p.postId,
              p.snippet ?? '',
              p.authorDisplayName ?? p.authorHandle ?? '',
              p.postType ?? '',
              p.uniqueViewers,
            ]),
          ]}
        >
          {data.topPosts.length > 0 ? (
            <Table
              data={data.topPosts}
              columnDefinitions={[
                {
                  id: 'post',
                  type: 'text',
                  header: columnHeader(
                    t('admin.analytics.table.post', { defaultValue: 'Post' }),
                    info('tablePost', 'Short snippet of the post body.'),
                  ),
                  render: (p: AnalyticsPostRow) => p.snippet ?? p.postId,
                },
                {
                  id: 'creator',
                  type: 'text',
                  header: columnHeader(
                    t('admin.analytics.table.creator', {
                      defaultValue: 'Creator',
                    }),
                    info('tableCreator', 'Author of the post.'),
                  ),
                  render: (p: AnalyticsPostRow) =>
                    p.authorDisplayName ?? p.authorHandle ?? '—',
                },
                {
                  id: 'type',
                  type: 'text',
                  header: columnHeader(
                    t('admin.analytics.table.type', { defaultValue: 'Type' }),
                    info(
                      'tableType',
                      'Post type (note, article, jam, poll, or event).',
                    ),
                  ),
                  render: (p: AnalyticsPostRow) => p.postType ?? '—',
                },
                {
                  id: 'uniqueViewers',
                  type: 'property',
                  header: columnHeader(
                    t('admin.analytics.metrics.uniqueViewers', {
                      defaultValue: 'Views',
                    }),
                    info(
                      'tableViews',
                      'Unique viewers of the post in the selected range.',
                    ),
                  ),
                },
              ]}
            />
          ) : (
            <p className="text-muted-foreground text-sm">No data yet</p>
          )}
        </AnalyticsSection>
      </div>
    </div>
  );
};
