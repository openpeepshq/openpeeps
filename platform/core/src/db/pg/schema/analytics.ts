import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { idColumn } from './base';

/** One row per UTC calendar day — community-wide counters. */
export const analyticsDailyTotals = pgTable('analytics_daily_totals', {
  day: date('day', { mode: 'string' }).primaryKey(),
  newMembers: integer('new_members').notNull().default(0),
  activeMembers: integer('active_members').notNull().default(0),
  posts: integer('posts').notNull().default(0),
  replies: integer('replies').notNull().default(0),
  likes: integer('likes').notNull().default(0),
  reposts: integer('reposts').notNull().default(0),
  bookmarks: integer('bookmarks').notNull().default(0),
  comments: integer('comments').notNull().default(0),
  dms: integer('dms').notNull().default(0),
  uniqueViewers: integer('unique_viewers').notNull().default(0),
  viewEvents: integer('view_events').notNull().default(0),
  jamSessions: integer('jam_sessions').notNull().default(0),
  jamParticipants: integer('jam_participants').notNull().default(0),
  compiledAt: timestamp('compiled_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

/** Per-group activity for a UTC day. */
export const analyticsDailyByGroup = pgTable(
  'analytics_daily_by_group',
  {
    id: idColumn(),
    day: date('day', { mode: 'string' }).notNull(),
    groupId: text('group_id').notNull(),
    posts: integer('posts').notNull().default(0),
    likes: integer('likes').notNull().default(0),
    comments: integer('comments').notNull().default(0),
    uniqueViewers: integer('unique_viewers').notNull().default(0),
    compiledAt: timestamp('compiled_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex('analytics_daily_by_group_day_group').on(t.day, t.groupId),
    index('analytics_daily_by_group_day_idx').on(t.day),
  ],
);

/** Activity punch-card cells: day-of-week (0=Sun) × hour UTC. */
export const analyticsDailyActivityHeatmap = pgTable(
  'analytics_daily_activity_heatmap',
  {
    id: idColumn(),
    day: date('day', { mode: 'string' }).notNull(),
    dow: integer('dow').notNull(),
    hour: integer('hour').notNull(),
    activityCount: integer('activity_count').notNull().default(0),
    compiledAt: timestamp('compiled_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex('analytics_heatmap_day_dow_hour').on(t.day, t.dow, t.hour),
    index('analytics_heatmap_day_idx').on(t.day),
  ],
);

/** Signup channel breakdown per day. */
export const analyticsDailySignupsByChannel = pgTable(
  'analytics_daily_signups_by_channel',
  {
    id: idColumn(),
    day: date('day', { mode: 'string' }).notNull(),
    channel: text('channel').notNull(),
    count: integer('count').notNull().default(0),
    compiledAt: timestamp('compiled_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex('analytics_signups_day_channel').on(t.day, t.channel),
    index('analytics_signups_day_idx').on(t.day),
  ],
);

/** Weekly signup cohort retention rates (JSON age → rate map). */
export const analyticsRetentionCohorts = pgTable(
  'analytics_retention_cohorts',
  {
    id: idColumn(),
    cohortWeek: date('cohort_week', { mode: 'string' }).notNull(),
    cohortSize: integer('cohort_size').notNull().default(0),
    rates: jsonb('rates').notNull().default({}),
    compiledAt: timestamp('compiled_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex('analytics_retention_cohort_week').on(t.cohortWeek)],
);

/** Per-post view rollups for top-posts reach. */
export const analyticsPostViewsDaily = pgTable(
  'analytics_post_views_daily',
  {
    id: idColumn(),
    day: date('day', { mode: 'string' }).notNull(),
    postId: text('post_id').notNull(),
    uniqueViewers: integer('unique_viewers').notNull().default(0),
    viewEvents: integer('view_events').notNull().default(0),
    compiledAt: timestamp('compiled_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex('analytics_post_views_day_post').on(t.day, t.postId),
    index('analytics_post_views_day_idx').on(t.day),
    index('analytics_post_views_post_idx').on(t.postId),
  ],
);

/** Report settings singleton. */
export const analyticsSettings = pgTable('analytics_settings', {
  id: text('id').primaryKey().default('default'),
  body: jsonb('body').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export const analyticsReportDeliveries = pgTable(
  'analytics_report_deliveries',
  {
    id: idColumn(),
    periodStart: date('period_start', { mode: 'string' }).notNull(),
    periodEnd: date('period_end', { mode: 'string' }).notNull(),
    recipients: jsonb('recipients').notNull().default([]),
    status: text('status').notNull().default('pending'),
    body: jsonb('body').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index('analytics_report_deliveries_period_idx').on(t.periodStart)],
);
