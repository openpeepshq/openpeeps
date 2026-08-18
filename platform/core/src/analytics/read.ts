import { and, asc, desc, gte, lte, min, sql, sum } from 'drizzle-orm';
import type {
  AnalyticsDateQuery,
  AnalyticsEngagement,
  AnalyticsGrowth,
  AnalyticsOverview,
  AnalyticsRetention,
  AnalyticsSeriesPoint,
} from '@openpeepshq/common/types';
import { formatISO, startOfDay, subDays, parseISO, addDays } from 'date-fns';
import { database } from '../db';
import {
  analyticsDailyByGroup,
  analyticsDailyTotals,
  analyticsPostViewsDaily,
  analyticsRetentionCohorts,
} from '../db/pg/schema/analytics';
import { groups, posts, profiles } from '../db/pg/schema/documents';
import {
  analyticsCacheKey,
  getAnalyticsCache,
  setAnalyticsCache,
} from './cache';
import {
  aggregateSeriesIntoBuckets,
  eachUtcDay,
  resolveAnalyticsRange,
  selectChartBuckets,
  type ResolvedAnalyticsRange,
} from './dateRange';
import { metricCard, sumSeries, averageSeries } from './metrics';
import { isPublicAnalyticsGroup } from './privacy';

const POST_TYPE_KEYS = ['jam', 'article', 'note', 'poll', 'event'] as const;

const todayString = () =>
  formatISO(startOfDay(new Date()), { representation: 'date' });

const includesToday = (to: string) => to >= todayString();

const utcDayStart = (day: string) => `${day}T00:00:00.000Z`;

const exclusiveEnd = (day: string) =>
  `${formatISO(addDays(parseISO(utcDayStart(day)), 1), { representation: 'date' })}T00:00:00.000Z`;

const rollingMauFrom = (to: string) =>
  formatISO(subDays(parseISO(utcDayStart(to)), 29), { representation: 'date' });

const countDistinctActives = async (
  from: string,
  to: string,
): Promise<number> => {
  const db = await database();
  const start = utcDayStart(from);
  const end = exclusiveEnd(to);
  const result = await db.execute(sql`
    select count(*)::int as c from (
      select creator_id as profile_id from posts
        where deleted_at is null
          and created_at >= ${start} and created_at < ${end}
      union
      select from_id from reactions
        where created_at >= ${start} and created_at < ${end}
      union
      select from_id from repost
        where created_at >= ${start} and created_at < ${end}
      union
      select from_id from reply_to
        where created_at >= ${start} and created_at < ${end}
      union
      select from_id from bookmarks
        where created_at >= ${start} and created_at < ${end}
    ) active
  `);
  const rows = result.rows as Array<Record<string, unknown>>;
  return Number(rows[0]?.c ?? 0);
};

/** Earliest day with compiled analytics — used to bound the `all` preset. */
const earliestAnalyticsDay = async (): Promise<string | null> => {
  const db = await database();
  const [row] = await db
    .select({ day: min(analyticsDailyTotals.day) })
    .from(analyticsDailyTotals);
  return row?.day ?? null;
};

const resolveQueryRange = async (
  query: AnalyticsDateQuery = {},
): Promise<ResolvedAnalyticsRange> => {
  const range = resolveAnalyticsRange(query);
  if (range.preset !== 'all') return range;
  const earliest = await earliestAnalyticsDay();
  if (!earliest || earliest <= range.from) return range;
  return {
    ...resolveAnalyticsRange({ from: earliest, to: range.to }),
    preset: 'all',
  };
};

const seriesFromTotals = (
  days: string[],
  rows: Array<{ day: string; value: number }>,
): AnalyticsSeriesPoint[] => {
  const map = new Map(rows.map((r) => [r.day, r.value]));
  return days.map((day) => ({ day, value: map.get(day) ?? 0 }));
};

const loadTotalsSeries = async (
  from: string,
  to: string,
  column:
    | 'newMembers'
    | 'activeMembers'
    | 'posts'
    | 'likes'
    | 'comments'
    | 'reposts'
    | 'bookmarks'
    | 'dms'
    | 'uniqueViewers'
    | 'viewEvents',
): Promise<AnalyticsSeriesPoint[]> => {
  const db = await database();
  const days = eachUtcDay(from, to);
  const col = analyticsDailyTotals[column];
  const rows = await db
    .select({ day: analyticsDailyTotals.day, value: col })
    .from(analyticsDailyTotals)
    .where(
      and(
        gte(analyticsDailyTotals.day, from),
        lte(analyticsDailyTotals.day, to),
      ),
    )
    .orderBy(asc(analyticsDailyTotals.day));
  return seriesFromTotals(
    days,
    rows.map((r) => ({ day: r.day, value: Number(r.value ?? 0) })),
  );
};

const sumColumn = async (
  from: string,
  to: string,
  column:
    | 'newMembers'
    | 'activeMembers'
    | 'posts'
    | 'likes'
    | 'comments'
    | 'reposts'
    | 'bookmarks'
    | 'dms'
    | 'uniqueViewers'
    | 'viewEvents',
) => sumSeries(await loadTotalsSeries(from, to, column));

const totalMembersAt = async (day: string): Promise<number> => {
  const db = await database();
  const end = `${day}T23:59:59.999Z`;
  const result = await db.execute(sql`
    select count(*)::int as c from profiles
    where deleted_at is null and created_at <= ${end}
  `);
  const rows = result.rows as Array<{ c?: number }>;
  return Number(rows[0]?.c ?? 0);
};

const totalPostsAt = async (day: string): Promise<number> => {
  const db = await database();
  const end = `${day}T23:59:59.999Z`;
  const result = await db.execute(sql`
    select count(*)::int as c from posts
    where deleted_at is null
      and visibility <> 'direct'
      and created_at <= ${end}
  `);
  const rows = result.rows as Array<{ c?: number }>;
  return Number(rows[0]?.c ?? 0);
};

const latestCompiledAt = async (
  from: string,
  to: string,
): Promise<string | null> => {
  const db = await database();
  const rows = await db
    .select({ compiledAt: analyticsDailyTotals.compiledAt })
    .from(analyticsDailyTotals)
    .where(
      and(
        gte(analyticsDailyTotals.day, from),
        lte(analyticsDailyTotals.day, to),
      ),
    )
    .orderBy(desc(analyticsDailyTotals.compiledAt))
    .limit(1);
  return rows[0]?.compiledAt ?? null;
};

type GroupBody = {
  name?: string;
  displayName?: string;
  capabilities?: { none?: { add?: string[] } };
};

const groupVisibility = (body: GroupBody): 'public' | 'private' =>
  isPublicAnalyticsGroup(body) ? 'public' : 'private';

const groupDisplayName = (body: GroupBody, handle: string | null | undefined) =>
  body.name ?? body.displayName ?? handle ?? undefined;

const enrichGroupRows = async (
  rows: Array<{
    groupId: string;
    handle: string | null | undefined;
    body: unknown;
    posts: number;
    likes: number;
    comments: number;
    uniqueViewers: number;
    activity: number;
  }>,
  from: string,
  to: string,
) => {
  if (rows.length === 0) return [];
  const db = await database();
  const start = `${from}T00:00:00.000Z`;
  const end = `${to}T23:59:59.999Z`;
  const ids = rows.map((r) => r.groupId);
  const dayCount = Math.max(1, eachUtcDay(from, to).length);

  const metaResult = await db.execute(sql`
    select
      g.id::text as group_id,
      coalesce((
        select count(*)::int from user_groups ug
        where ug.to_id = g.id::text
      ), 0) as members,
      coalesce((
        select count(*)::int from user_groups ug
        where ug.to_id = g.id::text
          and ug.created_at >= ${start}
          and ug.created_at <= ${end}
      ), 0) as growth,
      coalesce((
        select count(distinct p.creator_id)::int
        from post_groups pg
        join posts p on p.id::text = pg.from_id
        where pg.to_id = g.id::text
          and p.deleted_at is null
          and p.created_at >= ${start}
          and p.created_at <= ${end}
      ), 0) as active_members
    from groups g
    where g.id::text in (${sql.join(
      ids.map((id) => sql`${id}`),
      sql`, `,
    )})
  `);
  const metaById = new Map(
    (
      metaResult.rows as Array<{
        group_id: string;
        members?: number;
        growth?: number;
        active_members?: number;
      }>
    ).map((r) => [
      r.group_id,
      {
        members: Number(r.members ?? 0),
        growth: Number(r.growth ?? 0),
        activeMembers: Number(r.active_members ?? 0),
      },
    ]),
  );

  return rows.map((r) => {
    const body = (r.body ?? {}) as GroupBody;
    const meta = metaById.get(r.groupId) ?? {
      members: 0,
      growth: 0,
      activeMembers: 0,
    };
    const engagementRate =
      r.uniqueViewers <= 0
        ? 0
        : Math.round(((r.likes + r.comments) / r.uniqueViewers) * 1000) / 10;
    return {
      groupId: r.groupId,
      handle: r.handle ?? undefined,
      name: groupDisplayName(body, r.handle),
      posts: r.posts,
      likes: r.likes,
      comments: r.comments,
      uniqueViewers: r.uniqueViewers,
      activity: r.activity,
      visibility: groupVisibility(body),
      members: meta.members,
      activeMembers: meta.activeMembers,
      engagementRate,
      growth: meta.growth,
      dailyVisits: Math.round(r.uniqueViewers / dayCount),
    };
  });
};

const topGroups = async (from: string, to: string, limit = 6) => {
  const db = await database();
  const rows = await db
    .select({
      groupId: analyticsDailyByGroup.groupId,
      posts: sum(analyticsDailyByGroup.posts),
      likes: sum(analyticsDailyByGroup.likes),
      comments: sum(analyticsDailyByGroup.comments),
      uniqueViewers: sum(analyticsDailyByGroup.uniqueViewers),
      handle: groups.handle,
      body: groups.body,
    })
    .from(analyticsDailyByGroup)
    .leftJoin(
      groups,
      sql`${groups.id}::text = ${analyticsDailyByGroup.groupId}`,
    )
    .where(
      and(
        gte(analyticsDailyByGroup.day, from),
        lte(analyticsDailyByGroup.day, to),
      ),
    )
    .groupBy(analyticsDailyByGroup.groupId, groups.handle, groups.body)
    .orderBy(
      desc(
        sql`coalesce(${sum(analyticsDailyByGroup.posts)}, 0)
          + coalesce(${sum(analyticsDailyByGroup.likes)}, 0)
          + coalesce(${sum(analyticsDailyByGroup.comments)}, 0)`,
      ),
    )
    .limit(limit);

  return enrichGroupRows(
    rows.map((r) => {
      const postsCount = Number(r.posts ?? 0);
      const likesCount = Number(r.likes ?? 0);
      const commentsCount = Number(r.comments ?? 0);
      const viewers = Number(r.uniqueViewers ?? 0);
      return {
        groupId: r.groupId,
        handle: r.handle,
        body: r.body,
        posts: postsCount,
        likes: likesCount,
        comments: commentsCount,
        uniqueViewers: viewers,
        activity: postsCount + likesCount + commentsCount,
      };
    }),
    from,
    to,
  );
};

/** Top groups by new-member joins in range, with bucketed join series. */
const groupGrowthOverTime = async (from: string, to: string, limit = 6) => {
  const db = await database();
  const start = `${from}T00:00:00.000Z`;
  const end = `${to}T23:59:59.999Z`;
  const topResult = await db.execute(sql`
    select
      ug.to_id as group_id,
      count(*)::int as growth,
      g.handle,
      g.body
    from user_groups ug
    left join groups g on g.id::text = ug.to_id
    where ug.created_at >= ${start}
      and ug.created_at <= ${end}
      and (g.deleted_at is null or g.id is null)
    group by ug.to_id, g.handle, g.body
    order by growth desc
    limit ${limit}
  `);
  const topRows = topResult.rows as Array<{
    group_id: string;
    growth?: number;
    handle?: string | null;
    body?: unknown;
  }>;
  const series = topRows.map((r, i) => {
    const body = (r.body ?? {}) as GroupBody;
    return {
      key: `g${i}`,
      groupId: r.group_id,
      name: groupDisplayName(body, r.handle) ?? r.group_id.slice(0, 8),
    };
  });
  if (series.length === 0) {
    return { series, overTime: [] };
  }

  const idToKey = new Map(series.map((s) => [s.groupId, s.key]));
  const dailyResult = await db.execute(sql`
    select
      ug.to_id as group_id,
      (ug.created_at at time zone 'UTC')::date::text as day,
      count(*)::int as c
    from user_groups ug
    where ug.created_at >= ${start}
      and ug.created_at <= ${end}
      and ug.to_id in (${sql.join(
        series.map((s) => sql`${s.groupId}`),
        sql`, `,
      )})
    group by 1, 2
    order by 2
  `);
  const byDayGroup = new Map<string, number>();
  for (const row of dailyResult.rows as Array<{
    group_id: string;
    day: string;
    c?: number;
  }>) {
    const key = idToKey.get(row.group_id);
    if (!key) continue;
    byDayGroup.set(`${row.day}:${key}`, Number(row.c ?? 0));
  }

  const { buckets } = selectChartBuckets(from, to);
  const overTime = buckets.map((bucket) => {
    const values: Record<string, number> = {};
    for (const s of series) values[s.key] = 0;
    for (const day of eachUtcDay(bucket.from, bucket.to)) {
      for (const s of series) {
        values[s.key] += byDayGroup.get(`${day}:${s.key}`) ?? 0;
      }
    }
    return { day: bucket.key, label: bucket.label, values };
  });

  return { series, overTime };
};

const loadPostsByTypeDaily = async (from: string, to: string) => {
  const db = await database();
  const start = `${from}T00:00:00.000Z`;
  const end = `${to}T23:59:59.999Z`;
  const result = await db.execute(sql`
    select
      (created_at at time zone 'UTC')::date::text as day,
      case
        when type = 'event'
          and body->'jam' is not null
          and body->'jam' <> 'null'::jsonb
          then 'jam'
        when type = 'question' then 'poll'
        when type = 'article' then 'article'
        when type = 'event' then 'event'
        else 'note'
      end as kind,
      count(*)::int as c
    from posts
    where deleted_at is null
      and visibility <> 'direct'
      and created_at >= ${start}
      and created_at <= ${end}
    group by 1, 2
    order by 1
  `);
  return (result.rows as Array<{ day: string; kind: string; c: number }>).map(
    (r) => ({
      day: r.day,
      kind: r.kind,
      count: Number(r.c ?? 0),
    }),
  );
};

const totalGroupsAt = async (day: string): Promise<number> => {
  const db = await database();
  const end = `${day}T23:59:59.999Z`;
  const result = await db.execute(sql`
    select count(*)::int as c from groups
    where deleted_at is null and created_at <= ${end}
  `);
  const rows = result.rows as Array<{ c?: number }>;
  return Number(rows[0]?.c ?? 0);
};

const topMembers = async (from: string, to: string, limit = 10) => {
  const db = await database();
  const start = `${from}T00:00:00.000Z`;
  const end = `${to}T23:59:59.999Z`;
  const result = await db.execute(sql`
    with contrib as (
      select creator_id as profile_id from posts
        where deleted_at is null
          and visibility <> 'direct'
          and created_at >= ${start} and created_at <= ${end}
      union all
      select from_id from reactions
        where created_at >= ${start} and created_at <= ${end}
      union all
      select from_id from reply_to
        where created_at >= ${start} and created_at <= ${end}
      union all
      select from_id from repost
        where created_at >= ${start} and created_at <= ${end}
      union all
      select from_id from bookmarks
        where created_at >= ${start} and created_at <= ${end}
    ),
    scored as (
      select profile_id, count(*)::int as contributions
      from contrib
      group by profile_id
      order by contributions desc
      limit ${limit}
    )
    select
      s.profile_id,
      s.contributions,
      p.handle,
      p.body,
      p.created_at,
      coalesce(
        (
          select r.key from has_role hr
          join roles r on r.id::text = hr.to_id
          where hr.from_id = s.profile_id
          order by case r.key
            when 'owner' then 0
            when 'admin' then 1
            when 'moderator' then 2
            else 3
          end
          limit 1
        ),
        'member'
      ) as role
    from scored s
    join profiles p on p.id::text = s.profile_id
    where p.created_at is not null
  `);

  return (
    result.rows as Array<{
      profile_id: string;
      contributions: number;
      handle: string | null;
      body: { displayName?: string; name?: string } | null;
      created_at: string | Date;
      role: string;
    }>
  ).map((r) => ({
    profileId: r.profile_id,
    handle: r.handle ?? r.profile_id.slice(0, 8),
    displayName: r.body?.displayName ?? r.body?.name ?? undefined,
    role: r.role,
    joinedAt:
      typeof r.created_at === 'string'
        ? r.created_at
        : new Date(r.created_at).toISOString(),
    contributions: Number(r.contributions ?? 0),
  }));
};

/**
 * Top posts must not expose DM content or private-group posts (snippets +
 * authors). SQL mirrors {@link isAnalyticsTopPostEligible} /
 * {@link isPublicAnalyticsGroup}.
 */
const topPostsByViews = async (from: string, to: string, limit = 10) => {
  const db = await database();
  const rows = await db
    .select({
      postId: analyticsPostViewsDaily.postId,
      uniqueViewers: sum(analyticsPostViewsDaily.uniqueViewers),
      viewEvents: sum(analyticsPostViewsDaily.viewEvents),
      body: posts.body,
      type: posts.type,
      handle: profiles.handle,
      profileBody: profiles.body,
    })
    .from(analyticsPostViewsDaily)
    .innerJoin(
      posts,
      sql`${posts.id}::text = ${analyticsPostViewsDaily.postId}`,
    )
    .leftJoin(profiles, sql`${profiles.id}::text = ${posts.creatorId}`)
    .where(
      and(
        gte(analyticsPostViewsDaily.day, from),
        lte(analyticsPostViewsDaily.day, to),
        sql`${posts.visibility} <> 'direct'`,
        sql`not exists (
          select 1
          from post_groups pg
          inner join groups g on g.id::text = pg.to_id
          where pg.from_id = ${posts.id}::text
            and not coalesce(
              g.body->'capabilities'->'none'->'add' ? 'core-groups-read',
              false
            )
        )`,
      ),
    )
    .groupBy(
      analyticsPostViewsDaily.postId,
      posts.body,
      posts.type,
      profiles.handle,
      profiles.body,
    )
    .orderBy(desc(sum(analyticsPostViewsDaily.uniqueViewers)))
    .limit(limit);

  return rows.map((r) => {
    const body = (r.body ?? {}) as {
      content?: string;
      title?: string;
      name?: string;
      jam?: unknown;
      data?: { content?: string };
    };
    const content =
      body.title ?? body.name ?? body.content ?? body.data?.content ?? '';
    const postType =
      r.type === 'event' && body.jam != null
        ? 'jam'
        : r.type === 'question'
          ? 'poll'
          : (r.type ?? 'note');
    const profileBody = (r.profileBody ?? {}) as {
      displayName?: string;
      name?: string;
    };
    return {
      postId: r.postId,
      snippet: content.slice(0, 120) || undefined,
      authorHandle: r.handle ?? undefined,
      authorDisplayName:
        profileBody.displayName ?? profileBody.name ?? undefined,
      postType,
      uniqueViewers: Number(r.uniqueViewers ?? 0),
      viewEvents: Number(r.viewEvents ?? 0),
    };
  });
};

const withCache = async <T>(
  section: string,
  from: string,
  to: string,
  build: () => Promise<T>,
): Promise<T> => {
  const key = analyticsCacheKey(section, from, to);
  const cached = await getAnalyticsCache<T>(key);
  if (cached) return cached;
  const value = await build();
  await setAnalyticsCache(key, value, { includesToday: includesToday(to) });
  return value;
};

export const getAnalyticsOverview = async (
  query: AnalyticsDateQuery = {},
): Promise<AnalyticsOverview> => {
  const range = await resolveQueryRange(query);
  return withCache('overview-v6', range.from, range.to, async () => {
    const [
      activeMembersSeries,
      postsSeries,
      likesSeries,
      commentsSeries,
      postsByTypeDaily,
      topGroupRows,
      groupGrowth,
      topPostRows,
      topMemberRows,
      compiledAt,
      totalMembers,
      totalGroups,
      allTimePosts,
      prevActive,
      prevPosts,
      prevTotalMembers,
      prevTotalGroups,
      prevAllTimePosts,
    ] = await Promise.all([
      loadTotalsSeries(range.from, range.to, 'activeMembers'),
      loadTotalsSeries(range.from, range.to, 'posts'),
      loadTotalsSeries(range.from, range.to, 'likes'),
      loadTotalsSeries(range.from, range.to, 'comments'),
      loadPostsByTypeDaily(range.from, range.to),
      topGroups(range.from, range.to),
      groupGrowthOverTime(range.from, range.to),
      topPostsByViews(range.from, range.to),
      topMembers(range.from, range.to),
      latestCompiledAt(range.from, range.to),
      totalMembersAt(range.to),
      totalGroupsAt(range.to),
      totalPostsAt(range.to),
      sumColumn(range.previousFrom, range.previousTo, 'activeMembers'),
      sumColumn(range.previousFrom, range.previousTo, 'posts'),
      totalMembersAt(range.previousTo),
      totalGroupsAt(range.previousTo),
      totalPostsAt(range.previousTo),
    ]);

    const activeMembers = sumSeries(activeMembersSeries);
    const totalPosts = sumSeries(postsSeries);
    const { buckets } = selectChartBuckets(range.from, range.to);

    const typeTotals = Object.fromEntries(
      POST_TYPE_KEYS.map((k) => [k, 0]),
    ) as Record<(typeof POST_TYPE_KEYS)[number], number>;
    const dailyByType = new Map<string, Record<string, number>>();
    for (const row of postsByTypeDaily) {
      const kind = (POST_TYPE_KEYS as readonly string[]).includes(row.kind)
        ? (row.kind as (typeof POST_TYPE_KEYS)[number])
        : 'note';
      typeTotals[kind] += row.count;
      const dayMap = dailyByType.get(row.day) ?? {};
      dayMap[kind] = (dayMap[kind] ?? 0) + row.count;
      dailyByType.set(row.day, dayMap);
    }

    const postsOverTime = buckets.map((bucket) => {
      const point = {
        day: bucket.key,
        label: bucket.label,
        jam: 0,
        article: 0,
        note: 0,
        poll: 0,
        event: 0,
      };
      for (const day of eachUtcDay(bucket.from, bucket.to)) {
        const dayMap = dailyByType.get(day);
        if (!dayMap) continue;
        for (const key of POST_TYPE_KEYS) {
          point[key] += dayMap[key] ?? 0;
        }
      }
      return point;
    });

    const postTypes = POST_TYPE_KEYS.map((type) => ({
      type,
      count: typeTotals[type],
    }));

    const activeUsersSeries = aggregateSeriesIntoBuckets(
      activeMembersSeries,
      buckets,
    );

    const engagementRateSeries = postsSeries.map((p, i) => {
      const engagements =
        (likesSeries[i]?.value ?? 0) + (commentsSeries[i]?.value ?? 0);
      const postCount = p.value;
      return {
        day: p.day,
        value:
          postCount === 0
            ? 0
            : Math.round((engagements / postCount) * 1000) / 10,
      };
    });

    return {
      range: { ...range, compiledAt },
      metrics: {
        totalPosts: metricCard(
          'totalPosts',
          totalPosts,
          prevPosts,
          postsSeries,
        ),
        allTimePosts: metricCard(
          'allTimePosts',
          allTimePosts,
          prevAllTimePosts,
        ),
        totalMembers: metricCard(
          'totalMembers',
          totalMembers,
          prevTotalMembers,
        ),
        activeMembers: metricCard(
          'activeMembers',
          activeMembers,
          prevActive,
          activeMembersSeries,
        ),
        totalGroups: metricCard('totalGroups', totalGroups, prevTotalGroups),
      },
      postsOverTime,
      postTypes,
      activeUsersSeries,
      topMembers: topMemberRows,
      topPosts: topPostRows,
      activitySeries: activeMembersSeries,
      engagementRateSeries,
      topGroups: topGroupRows,
      groupGrowthSeries: groupGrowth.series,
      groupGrowthOverTime: groupGrowth.overTime,
    };
  });
};

export const getAnalyticsGrowth = async (
  query: AnalyticsDateQuery = {},
): Promise<AnalyticsGrowth> => {
  const range = await resolveQueryRange(query);
  return withCache('growth-v6', range.from, range.to, async () => {
    const db = await database();
    const mauFrom = rollingMauFrom(range.to);
    const prevMauFrom = rollingMauFrom(range.previousTo);
    const [
      newMembersSeries,
      activeMembersSeries,
      prevNew,
      prevActiveSeries,
      mau,
      prevMau,
      compiledAt,
      recentRows,
    ] = await Promise.all([
      loadTotalsSeries(range.from, range.to, 'newMembers'),
      loadTotalsSeries(range.from, range.to, 'activeMembers'),
      sumColumn(range.previousFrom, range.previousTo, 'newMembers'),
      loadTotalsSeries(range.previousFrom, range.previousTo, 'activeMembers'),
      countDistinctActives(mauFrom, range.to),
      countDistinctActives(prevMauFrom, range.previousTo),
      latestCompiledAt(range.from, range.to),
      db.execute(sql`
        select p.id, p.handle, p.body, p.created_at,
          case when r.to_id is not null then 'invite' else 'organic' end as channel
        from profiles p
        left join invite_link_redeemers r on r.to_id = p.id::text
        where p.deleted_at is null
          and p.created_at >= ${`${range.from}T00:00:00.000Z`}
          and p.created_at <= ${`${range.to}T23:59:59.999Z`}
        order by p.created_at desc
        limit 25
      `),
    ]);

    const newSignups = sumSeries(newMembersSeries);
    const dau = averageSeries(activeMembersSeries);
    const prevDau = averageSeries(prevActiveSeries);
    const dauMau = mau === 0 ? 0 : Math.round((dau / mau) * 1000) / 10;
    const prevDauMau =
      prevMau === 0 ? 0 : Math.round((prevDau / prevMau) * 1000) / 10;
    const byDay = new Map(
      newMembersSeries.map((p) => [p.day, p.value] as const),
    );
    const signupsByDay = eachUtcDay(range.from, range.to).map((day) => ({
      day,
      value: byDay.get(day) ?? 0,
    }));
    const recentSignups = (
      recentRows.rows as Array<{
        id: string;
        handle: string;
        body: { displayName?: string } | null;
        created_at: string;
        channel: string;
      }>
    ).map((r) => ({
      profileId: String(r.id),
      handle: r.handle,
      displayName: r.body?.displayName,
      joinedAt: r.created_at,
      channel: r.channel,
    }));

    return {
      range: { ...range, compiledAt },
      metrics: {
        newSignups: metricCard(
          'newSignups',
          newSignups,
          prevNew,
          newMembersSeries,
        ),
        dau: metricCard('dau', dau, prevDau, activeMembersSeries),
        mau: metricCard('mau', mau, prevMau),
        dauMau: metricCard('dauMau', dauMau, prevDauMau),
      },
      signupsByDay,
      recentSignups,
    };
  });
};

export const getAnalyticsEngagement = async (
  query: AnalyticsDateQuery = {},
): Promise<AnalyticsEngagement> => {
  const range = await resolveQueryRange(query);
  return withCache('engagement-v4', range.from, range.to, async () => {
    const [
      likesSeries,
      commentsSeries,
      repostsSeries,
      bookmarksSeries,
      dmsSeries,
      viewersSeries,
      impressionsSeries,
      prevLikes,
      prevComments,
      prevReposts,
      prevBookmarks,
      prevDms,
      prevViewers,
      prevImpressions,
      groups,
      compiledAt,
    ] = await Promise.all([
      loadTotalsSeries(range.from, range.to, 'likes'),
      loadTotalsSeries(range.from, range.to, 'comments'),
      loadTotalsSeries(range.from, range.to, 'reposts'),
      loadTotalsSeries(range.from, range.to, 'bookmarks'),
      loadTotalsSeries(range.from, range.to, 'dms'),
      loadTotalsSeries(range.from, range.to, 'uniqueViewers'),
      loadTotalsSeries(range.from, range.to, 'viewEvents'),
      sumColumn(range.previousFrom, range.previousTo, 'likes'),
      sumColumn(range.previousFrom, range.previousTo, 'comments'),
      sumColumn(range.previousFrom, range.previousTo, 'reposts'),
      sumColumn(range.previousFrom, range.previousTo, 'bookmarks'),
      sumColumn(range.previousFrom, range.previousTo, 'dms'),
      sumColumn(range.previousFrom, range.previousTo, 'uniqueViewers'),
      sumColumn(range.previousFrom, range.previousTo, 'viewEvents'),
      topGroups(range.from, range.to),
      latestCompiledAt(range.from, range.to),
    ]);

    const { buckets } = selectChartBuckets(range.from, range.to);
    const likesByBucket = aggregateSeriesIntoBuckets(likesSeries, buckets);
    const commentsByBucket = aggregateSeriesIntoBuckets(
      commentsSeries,
      buckets,
    );
    const repostsByBucket = aggregateSeriesIntoBuckets(repostsSeries, buckets);
    const bookmarksByBucket = aggregateSeriesIntoBuckets(
      bookmarksSeries,
      buckets,
    );
    const dmsByBucket = aggregateSeriesIntoBuckets(dmsSeries, buckets);
    const impressionsByPeriod = aggregateSeriesIntoBuckets(
      impressionsSeries,
      buckets,
    );
    const engagementOverTime = buckets.map((bucket, i) => ({
      day: bucket.key,
      label: bucket.label,
      likes: likesByBucket[i]?.value ?? 0,
      comments: commentsByBucket[i]?.value ?? 0,
      reposts: repostsByBucket[i]?.value ?? 0,
      bookmarks: bookmarksByBucket[i]?.value ?? 0,
      dms: dmsByBucket[i]?.value ?? 0,
    }));

    return {
      range: { ...range, compiledAt },
      metrics: {
        likes: metricCard(
          'likes',
          sumSeries(likesSeries),
          prevLikes,
          likesSeries,
        ),
        comments: metricCard(
          'comments',
          sumSeries(commentsSeries),
          prevComments,
          commentsSeries,
        ),
        reposts: metricCard(
          'reposts',
          sumSeries(repostsSeries),
          prevReposts,
          repostsSeries,
        ),
        bookmarks: metricCard(
          'bookmarks',
          sumSeries(bookmarksSeries),
          prevBookmarks,
          bookmarksSeries,
        ),
        dms: metricCard('dms', sumSeries(dmsSeries), prevDms, dmsSeries),
        uniqueViewers: metricCard(
          'uniqueViewers',
          sumSeries(viewersSeries),
          prevViewers,
          viewersSeries,
        ),
        impressions: metricCard(
          'impressions',
          sumSeries(impressionsSeries),
          prevImpressions,
          impressionsSeries,
        ),
      },
      engagementOverTime,
      impressionsByPeriod,
      postsByGroup: groups,
    };
  });
};

export const getAnalyticsRetention = async (
  query: AnalyticsDateQuery = {},
): Promise<AnalyticsRetention> => {
  const range = await resolveQueryRange(query);
  return withCache('retention-v2', range.from, range.to, async () => {
    const db = await database();
    const [cohortRows, groups, compiledAt] = await Promise.all([
      db
        .select()
        .from(analyticsRetentionCohorts)
        .where(
          and(
            gte(analyticsRetentionCohorts.cohortWeek, range.from),
            lte(analyticsRetentionCohorts.cohortWeek, range.to),
          ),
        )
        .orderBy(asc(analyticsRetentionCohorts.cohortWeek)),
      topGroups(range.from, range.to),
      latestCompiledAt(range.from, range.to),
    ]);

    const rates = cohortRows.map((c) => c.rates as Record<string, number>);
    const avg = (key: string) => {
      if (rates.length === 0) return 0;
      return (
        Math.round(
          (rates.reduce((a, r) => a + Number(r[key] ?? 0), 0) / rates.length) *
            10,
        ) / 10
      );
    };

    return {
      range: { ...range, compiledAt },
      metrics: {
        day1: metricCard('day1', avg('1'), 0),
        day7: metricCard('day7', avg('7'), 0),
        day30: metricCard('day30', avg('30'), 0),
      },
      cohorts: cohortRows.map((c) => ({
        cohortWeek: c.cohortWeek,
        cohortSize: c.cohortSize,
        rates: (c.rates ?? {}) as Record<string, number>,
      })),
      retentionByGroup: groups,
    };
  });
};

export const exportAnalyticsCsv = async (
  query: AnalyticsDateQuery = {},
): Promise<string> => {
  const overview = await getAnalyticsOverview(query);
  const lines = [
    'bucket,label,active_members,posts,jams,articles,notes,polls,events',
    ...overview.activeUsersSeries.map((p, i) => {
      const posts = overview.postsOverTime[i];
      const postTotal = posts
        ? posts.jam + posts.article + posts.note + posts.poll + posts.event
        : 0;
      return [
        p.day,
        p.label,
        p.value,
        postTotal,
        posts?.jam ?? 0,
        posts?.article ?? 0,
        posts?.note ?? 0,
        posts?.poll ?? 0,
        posts?.event ?? 0,
      ].join(',');
    }),
  ];
  return lines.join('\n');
};
