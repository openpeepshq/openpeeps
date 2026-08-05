import { sql } from 'drizzle-orm';
import { formatISO, startOfDay, subDays } from 'date-fns';
import { database, type PgDb } from '../db';
import { analyticsDailyTotals } from '../db/pg/schema/analytics';
import { logger } from '../log';
import { invalidateAnalyticsCache } from './cache';

const log = logger('app:analytics:compile');

const dayString = (d: Date) =>
  formatISO(startOfDay(d), { representation: 'date' });

const dayBounds = (day: string) => {
  const start = `${day}T00:00:00.000Z`;
  const next = dayString(subDays(new Date(`${day}T00:00:00.000Z`), -1));
  const end = `${next}T00:00:00.000Z`;
  return { start, end };
};

const countScalar = async (db: PgDb, query: ReturnType<typeof sql>) => {
  const result = await db.execute(query);
  const rows = result.rows as Array<Record<string, unknown>>;
  return Number(rows[0]?.c ?? 0);
};

export const compileAnalyticsDay = async (day: string): Promise<void> => {
  const db = await database();
  const { start, end } = dayBounds(day);
  const now = new Date().toISOString();

  const newMembers = await countScalar(
    db,
    sql`select count(*)::int as c from profiles
        where deleted_at is null
          and created_at >= ${start} and created_at < ${end}`,
  );

  const posts = await countScalar(
    db,
    sql`select count(*)::int as c from posts
        where deleted_at is null and visibility <> 'direct'
          and created_at >= ${start} and created_at < ${end}`,
  );

  const replies = await countScalar(
    db,
    sql`select count(*)::int as c from reply_to
        where created_at >= ${start} and created_at < ${end}`,
  );

  const likes = await countScalar(
    db,
    sql`select count(*)::int as c from reactions
        where created_at >= ${start} and created_at < ${end}`,
  );

  const reposts = await countScalar(
    db,
    sql`select count(*)::int as c from repost
        where created_at >= ${start} and created_at < ${end}`,
  );

  const bookmarks = await countScalar(
    db,
    sql`select count(*)::int as c from bookmarks
        where created_at >= ${start} and created_at < ${end}`,
  );

  const comments = replies;

  const dms = await countScalar(
    db,
    sql`select count(*)::int as c from posts
        where deleted_at is null and visibility = 'direct'
          and created_at >= ${start} and created_at < ${end}`,
  );

  const uniqueViewers = await countScalar(
    db,
    sql`select count(distinct from_id)::int as c from post_seen
        where created_at >= ${start} and created_at < ${end}`,
  );

  const viewEvents = await countScalar(
    db,
    sql`select count(*)::int as c from post_seen
        where created_at >= ${start} and created_at < ${end}`,
  );

  const jamSessions = await countScalar(
    db,
    sql`select count(*)::int as c from jam_events
        where deleted_at is null and body->>'type' = 'start'
          and created_at >= ${start} and created_at < ${end}`,
  );

  const jamParticipants = await countScalar(
    db,
    sql`select count(*)::int as c from jam_events
        where deleted_at is null and body->>'type' = 'join'
          and created_at >= ${start} and created_at < ${end}`,
  );

  const activeMembers = await countScalar(
    db,
    sql`select count(*)::int as c from (
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
        ) active`,
  );

  await db
    .insert(analyticsDailyTotals)
    .values({
      day,
      newMembers,
      activeMembers,
      posts,
      replies,
      likes,
      reposts,
      bookmarks,
      comments,
      dms,
      uniqueViewers,
      viewEvents,
      jamSessions,
      jamParticipants,
      compiledAt: now,
    })
    .onConflictDoUpdate({
      target: analyticsDailyTotals.day,
      set: {
        newMembers,
        activeMembers,
        posts,
        replies,
        likes,
        reposts,
        bookmarks,
        comments,
        dms,
        uniqueViewers,
        viewEvents,
        jamSessions,
        jamParticipants,
        compiledAt: now,
      },
    });

  await db.execute(
    sql`delete from analytics_daily_by_group where day = ${day}`,
  );
  await db.execute(sql`
    insert into analytics_daily_by_group
      (id, day, group_id, posts, likes, comments, unique_viewers, compiled_at)
    select
      gen_random_uuid(),
      ${day},
      pg.to_id,
      count(distinct p.id)::int,
      0,
      0,
      0,
      ${now}
    from post_groups pg
    join posts p on p.id::text = pg.from_id
    where p.deleted_at is null
      and p.created_at >= ${start} and p.created_at < ${end}
    group by pg.to_id
  `);

  // Likes/comments attributed via posts in the group (best-effort).
  await db.execute(sql`
    update analytics_daily_by_group g
    set
      likes = coalesce((
        select count(*)::int from reactions r
        join post_groups pg on pg.from_id = r.to_id
        where pg.to_id = g.group_id
          and r.created_at >= ${start} and r.created_at < ${end}
      ), 0),
      comments = coalesce((
        select count(*)::int from reply_to rt
        join post_groups pg on pg.from_id = rt.to_id
        where pg.to_id = g.group_id
          and rt.created_at >= ${start} and rt.created_at < ${end}
      ), 0),
      unique_viewers = coalesce((
        select count(distinct ps.from_id)::int from post_seen ps
        join post_groups pg on pg.from_id = ps.to_id
        where pg.to_id = g.group_id
          and ps.created_at >= ${start} and ps.created_at < ${end}
      ), 0),
      compiled_at = ${now}
    where g.day = ${day}
  `);

  await db.execute(
    sql`delete from analytics_daily_activity_heatmap where day = ${day}`,
  );
  await db.execute(sql`
    insert into analytics_daily_activity_heatmap
      (id, day, dow, hour, activity_count, compiled_at)
    select
      gen_random_uuid(),
      ${day},
      extract(dow from created_at at time zone 'UTC')::int,
      extract(hour from created_at at time zone 'UTC')::int,
      count(*)::int,
      ${now}
    from (
      select created_at from posts
        where deleted_at is null and created_at >= ${start} and created_at < ${end}
      union all
      select created_at from reactions
        where created_at >= ${start} and created_at < ${end}
      union all
      select created_at from reply_to
        where created_at >= ${start} and created_at < ${end}
      union all
      select created_at from repost
        where created_at >= ${start} and created_at < ${end}
    ) activity
    group by 3, 4
  `);

  await db.execute(
    sql`delete from analytics_daily_signups_by_channel where day = ${day}`,
  );
  await db.execute(sql`
    insert into analytics_daily_signups_by_channel
      (id, day, channel, count, compiled_at)
    select
      gen_random_uuid(),
      ${day},
      case when r.from_id is not null then 'invite' else 'organic' end,
      count(*)::int,
      ${now}
    from profiles p
    left join invite_link_redeemers r on r.to_id = p.id::text
    where p.deleted_at is null
      and p.created_at >= ${start} and p.created_at < ${end}
    group by 3
  `);

  await db.execute(
    sql`delete from analytics_post_views_daily where day = ${day}`,
  );
  await db.execute(sql`
    insert into analytics_post_views_daily
      (id, day, post_id, unique_viewers, view_events, compiled_at)
    select
      gen_random_uuid(),
      ${day},
      to_id,
      count(distinct from_id)::int,
      count(*)::int,
      ${now}
    from post_seen
    where created_at >= ${start} and created_at < ${end}
    group by to_id
  `);

  log.info(`Compiled analytics for ${day}`);
};

export const compileRetentionCohorts = async (): Promise<void> => {
  const db = await database();
  const now = new Date().toISOString();

  // Cohort week = date_trunc week of profile created_at; rates at ages 1/7/30.
  await db.execute(sql`delete from analytics_retention_cohorts`);
  await db.execute(sql`
    insert into analytics_retention_cohorts
      (id, cohort_week, cohort_size, rates, compiled_at)
    with cohorts as (
      select
        (date_trunc('week', created_at at time zone 'UTC'))::date as cohort_week,
        id::text as profile_id,
        created_at
      from profiles
      where deleted_at is null
        and created_at >= (now() - interval '26 weeks')
    ),
    sized as (
      select cohort_week, count(*)::int as cohort_size
      from cohorts
      group by cohort_week
    ),
    retained as (
      select
        c.cohort_week,
        count(distinct case when a.day_offset = 1 then c.profile_id end)::int as d1,
        count(distinct case when a.day_offset = 7 then c.profile_id end)::int as d7,
        count(distinct case when a.day_offset = 30 then c.profile_id end)::int as d30
      from cohorts c
      left join lateral (
        select distinct
          extract(day from (act.created_at - c.created_at))::int as day_offset
        from (
          select creator_id as profile_id, created_at from posts where deleted_at is null
          union all
          select from_id, created_at from reactions
          union all
          select from_id, created_at from reply_to
          union all
          select from_id, created_at from repost
          union all
          select from_id, created_at from bookmarks
        ) act
        where act.profile_id = c.profile_id
          and extract(day from (act.created_at - c.created_at))::int in (1, 7, 30)
      ) a on true
      group by c.cohort_week
    )
    select
      gen_random_uuid(),
      s.cohort_week,
      s.cohort_size,
      jsonb_build_object(
        '1', case when s.cohort_size = 0 then 0
             else round((coalesce(r.d1, 0)::numeric / s.cohort_size) * 100, 2) end,
        '7', case when s.cohort_size = 0 then 0
             else round((coalesce(r.d7, 0)::numeric / s.cohort_size) * 100, 2) end,
        '30', case when s.cohort_size = 0 then 0
             else round((coalesce(r.d30, 0)::numeric / s.cohort_size) * 100, 2) end
      ),
      ${now}
    from sized s
    left join retained r on r.cohort_week = s.cohort_week
  `);

  log.info('Compiled retention cohorts');
};

export const compileRecentAnalytics = async (): Promise<void> => {
  const today = dayString(new Date());
  const yesterday = dayString(subDays(new Date(), 1));
  await compileAnalyticsDay(yesterday);
  await compileAnalyticsDay(today);
  await invalidateAnalyticsCache();
};

export const backfillAnalytics = async (
  fromDay: string,
  toDay: string,
): Promise<number> => {
  let cursor = startOfDay(new Date(`${fromDay}T00:00:00.000Z`));
  const end = startOfDay(new Date(`${toDay}T00:00:00.000Z`));
  let count = 0;
  while (cursor <= end) {
    await compileAnalyticsDay(dayString(cursor));
    count += 1;
    cursor = subDays(cursor, -1);
  }
  await compileRetentionCohorts();
  await invalidateAnalyticsCache();
  return count;
};
