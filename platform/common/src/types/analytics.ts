import { z } from 'zod';

export const analyticsPresetSchema = z.enum([
  '7d',
  '30d',
  '3m',
  '6m',
  '12m',
  'all',
]);
export type AnalyticsPreset = z.infer<typeof analyticsPresetSchema>;

export const analyticsDateQuerySchema = z.object({
  preset: analyticsPresetSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type AnalyticsDateQuery = z.infer<typeof analyticsDateQuerySchema>;

export const analyticsSeriesPointSchema = z.object({
  day: z.string(),
  value: z.number(),
});
export type AnalyticsSeriesPoint = z.infer<typeof analyticsSeriesPointSchema>;

export const analyticsMetricCardSchema = z.object({
  key: z.string(),
  value: z.number(),
  previousValue: z.number(),
  deltaPct: z.number().nullable(),
  series: analyticsSeriesPointSchema.array().optional(),
});
export type AnalyticsMetricCard = z.infer<typeof analyticsMetricCardSchema>;

export const analyticsHeatmapCellSchema = z.object({
  dow: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  value: z.number(),
});
export type AnalyticsHeatmapCell = z.infer<typeof analyticsHeatmapCellSchema>;

/** One cell per calendar day for period heatmaps. */
export const analyticsDayHeatmapCellSchema = z.object({
  day: z.string(),
  value: z.number(),
});
export type AnalyticsDayHeatmapCell = z.infer<
  typeof analyticsDayHeatmapCellSchema
>;

export const analyticsGroupRowSchema = z.object({
  groupId: z.string(),
  handle: z.string().optional(),
  name: z.string().optional(),
  posts: z.number(),
  likes: z.number(),
  comments: z.number(),
  uniqueViewers: z.number(),
  activity: z.number(),
  visibility: z.enum(['public', 'private']),
  members: z.number(),
  activeMembers: z.number(),
  /** (likes + comments) / unique viewers, as a percentage. */
  engagementRate: z.number(),
  /** New members who joined the group in the selected range. */
  growth: z.number(),
  /** Average unique viewers per day in the selected range. */
  dailyVisits: z.number(),
});
export type AnalyticsGroupRow = z.infer<typeof analyticsGroupRowSchema>;

export const analyticsGroupGrowthSeriesSchema = z.object({
  key: z.string(),
  groupId: z.string(),
  name: z.string(),
});
export type AnalyticsGroupGrowthSeries = z.infer<
  typeof analyticsGroupGrowthSeriesSchema
>;

export const analyticsGroupGrowthPointSchema = z.object({
  day: z.string(),
  label: z.string(),
  values: z.record(z.string(), z.number()),
});
export type AnalyticsGroupGrowthPoint = z.infer<
  typeof analyticsGroupGrowthPointSchema
>;

export const analyticsPostRowSchema = z.object({
  postId: z.string(),
  snippet: z.string().optional(),
  authorHandle: z.string().optional(),
  authorDisplayName: z.string().optional(),
  postType: z.string().optional(),
  likes: z.number().optional(),
  comments: z.number().optional(),
  reposts: z.number().optional(),
  uniqueViewers: z.number(),
  viewEvents: z.number().optional(),
});
export type AnalyticsPostRow = z.infer<typeof analyticsPostRowSchema>;

export const analyticsMemberRowSchema = z.object({
  profileId: z.string(),
  handle: z.string(),
  displayName: z.string().optional(),
  role: z.string().optional(),
  joinedAt: z.string(),
  contributions: z.number(),
});
export type AnalyticsMemberRow = z.infer<typeof analyticsMemberRowSchema>;

export const analyticsPostTypeKeySchema = z.enum([
  'jam',
  'article',
  'note',
  'poll',
  'event',
]);
export type AnalyticsPostTypeKey = z.infer<typeof analyticsPostTypeKeySchema>;

export const analyticsPostTypeCountSchema = z.object({
  type: analyticsPostTypeKeySchema,
  count: z.number(),
});
export type AnalyticsPostTypeCount = z.infer<
  typeof analyticsPostTypeCountSchema
>;

export const analyticsStackedPointSchema = z.object({
  day: z.string(),
  label: z.string(),
  jam: z.number(),
  article: z.number(),
  note: z.number(),
  poll: z.number(),
  event: z.number(),
});
export type AnalyticsStackedPoint = z.infer<typeof analyticsStackedPointSchema>;

export const analyticsBucketedPointSchema = z.object({
  day: z.string(),
  label: z.string(),
  value: z.number(),
});
export type AnalyticsBucketedPoint = z.infer<
  typeof analyticsBucketedPointSchema
>;

export const analyticsSignupRowSchema = z.object({
  profileId: z.string(),
  handle: z.string(),
  displayName: z.string().optional(),
  joinedAt: z.string(),
  channel: z.string(),
});
export type AnalyticsSignupRow = z.infer<typeof analyticsSignupRowSchema>;

export const analyticsChannelPointSchema = z.object({
  day: z.string(),
  channel: z.string(),
  count: z.number(),
});
export type AnalyticsChannelPoint = z.infer<typeof analyticsChannelPointSchema>;

export const analyticsRangeMetaSchema = z.object({
  from: z.string(),
  to: z.string(),
  previousFrom: z.string(),
  previousTo: z.string(),
  preset: analyticsPresetSchema.optional(),
  compiledAt: z.string().nullable(),
});
export type AnalyticsRangeMeta = z.infer<typeof analyticsRangeMetaSchema>;

export const analyticsOverviewSchema = z.object({
  range: analyticsRangeMetaSchema,
  metrics: z.object({
    totalPosts: analyticsMetricCardSchema,
    /** Cumulative posts created on or before the range end. */
    allTimePosts: analyticsMetricCardSchema,
    totalMembers: analyticsMetricCardSchema,
    activeMembers: analyticsMetricCardSchema,
    totalGroups: analyticsMetricCardSchema,
  }),
  postsOverTime: analyticsStackedPointSchema.array(),
  postTypes: analyticsPostTypeCountSchema.array(),
  activeUsersSeries: analyticsBucketedPointSchema.array(),
  topMembers: analyticsMemberRowSchema.array(),
  topPosts: analyticsPostRowSchema.array(),
  /** @deprecated kept for report/CSV compatibility */
  activitySeries: analyticsSeriesPointSchema.array(),
  engagementRateSeries: analyticsSeriesPointSchema.array(),
  topGroups: analyticsGroupRowSchema.array(),
  /** Top groups by new-member growth, for the multi-line growth chart. */
  groupGrowthSeries: analyticsGroupGrowthSeriesSchema.array(),
  groupGrowthOverTime: analyticsGroupGrowthPointSchema.array(),
});
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;

export const analyticsGrowthSchema = z.object({
  range: analyticsRangeMetaSchema,
  metrics: z.object({
    newSignups: analyticsMetricCardSchema,
    dau: analyticsMetricCardSchema,
    mau: analyticsMetricCardSchema,
    dauMau: analyticsMetricCardSchema,
  }),
  /** New-member counts for every day in the selected range. */
  signupsByDay: analyticsDayHeatmapCellSchema.array(),
  recentSignups: analyticsSignupRowSchema.array(),
});
export type AnalyticsGrowth = z.infer<typeof analyticsGrowthSchema>;

export const analyticsEngagementOverTimePointSchema = z.object({
  day: z.string(),
  label: z.string(),
  likes: z.number(),
  comments: z.number(),
  reposts: z.number(),
  bookmarks: z.number(),
  dms: z.number(),
});
export type AnalyticsEngagementOverTimePoint = z.infer<
  typeof analyticsEngagementOverTimePointSchema
>;

export const analyticsEngagementSchema = z.object({
  range: analyticsRangeMetaSchema,
  metrics: z.object({
    likes: analyticsMetricCardSchema,
    comments: analyticsMetricCardSchema,
    reposts: analyticsMetricCardSchema,
    bookmarks: analyticsMetricCardSchema,
    dms: analyticsMetricCardSchema,
    uniqueViewers: analyticsMetricCardSchema,
    impressions: analyticsMetricCardSchema,
  }),
  engagementOverTime: analyticsEngagementOverTimePointSchema.array(),
  impressionsByPeriod: analyticsBucketedPointSchema.array(),
  postsByGroup: analyticsGroupRowSchema.array(),
});
export type AnalyticsEngagement = z.infer<typeof analyticsEngagementSchema>;

export const analyticsRetentionSchema = z.object({
  range: analyticsRangeMetaSchema,
  metrics: z.object({
    day1: analyticsMetricCardSchema,
    day7: analyticsMetricCardSchema,
    day30: analyticsMetricCardSchema,
  }),
  cohorts: z
    .object({
      cohortWeek: z.string(),
      cohortSize: z.number(),
      rates: z.record(z.string(), z.number()),
    })
    .array(),
  retentionByGroup: analyticsGroupRowSchema.array(),
});
export type AnalyticsRetention = z.infer<typeof analyticsRetentionSchema>;

export const analyticsReportSettingsSchema = z.object({
  enabled: z.boolean(),
  recipients: z.string().email().array(),
});
export type AnalyticsReportSettings = z.infer<
  typeof analyticsReportSettingsSchema
>;

export const analyticsBackfillInputSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
export type AnalyticsBackfillInput = z.infer<
  typeof analyticsBackfillInputSchema
>;

export const analyticsBackfillResponseSchema = z.object({
  jobId: z.string().optional(),
  from: z.string(),
  to: z.string(),
});
export type AnalyticsBackfillResponse = z.infer<
  typeof analyticsBackfillResponseSchema
>;

export const analyticsClickKindSchema = z.enum(['page', 'link']);
export type AnalyticsClickKind = z.infer<typeof analyticsClickKindSchema>;

export const analyticsClickEventSchema = z.object({
  kind: analyticsClickKindSchema,
  target: z.string().min(1).max(2048),
});
export type AnalyticsClickEvent = z.infer<typeof analyticsClickEventSchema>;

export const analyticsClicksIngestSchema = z.object({
  events: analyticsClickEventSchema.array().min(1).max(20),
});
export type AnalyticsClicksIngest = z.infer<typeof analyticsClicksIngestSchema>;

export const analyticsClickRowSchema = z.object({
  target: z.string(),
  clicks: z.number(),
});
export type AnalyticsClickRow = z.infer<typeof analyticsClickRowSchema>;

export const analyticsClicksSchema = z.object({
  range: analyticsRangeMetaSchema,
  pages: analyticsClickRowSchema.array(),
  links: analyticsClickRowSchema.array(),
});
export type AnalyticsClicks = z.infer<typeof analyticsClicksSchema>;
