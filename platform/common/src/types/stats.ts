import { z, ZodObject } from 'zod';
import { publicPostSchema, publicProfileSchema } from './api';

const objectStatsSchema = z.object({
  day: z.object({
    currentPeriod: z.number(),
    lastPeriod: z.number(),
  }),
  week: z.object({
    currentPeriod: z.number(),
    lastPeriod: z.number(),
  }),
  month: z.object({
    currentPeriod: z.number(),
    lastPeriod: z.number(),
  }),
  quarter: z.object({
    currentPeriod: z.number(),
    lastPeriod: z.number(),
  }),
  year: z.object({
    currentPeriod: z.number(),
    lastPeriod: z.number(),
  }),
});

const objectStatsWithAllSchema = objectStatsSchema.extend({
  all: z.number(),
});

export type ObjectStats = z.infer<typeof objectStatsSchema>;
export type ObjectStatsWithAll = z.infer<typeof objectStatsWithAllSchema>;

export const publicPostWithActivityScoreSchema = publicPostSchema.extend({
  activityScore: z.number(),
});

export type PublicPostWithActivityScore = z.infer<
  typeof publicPostWithActivityScoreSchema
>;

export const publicProfileWithActivityScoreSchema = publicProfileSchema.extend({
  activityScore: z.number(),
});
export type PublicProfileWithActivityScore = z.infer<
  typeof publicProfileWithActivityScoreSchema
>;

export type TopListKey = 'day' | 'week' | 'month' | 'quarter' | 'year';
const topPostsListSchema = publicPostWithActivityScoreSchema.array().max(5);
const _topProfilesListSchema = publicProfileWithActivityScoreSchema
  .array()
  .max(5);

export const topPostsSchema: ZodObject<
  Record<TopListKey, typeof topPostsListSchema>
> = z.object({
  day: topPostsListSchema,
  week: topPostsListSchema,
  month: topPostsListSchema,
  quarter: topPostsListSchema,
  year: topPostsListSchema,
});

export const topProfilesSchema: ZodObject<
  Record<TopListKey, typeof _topProfilesListSchema>
> = z.object({
  day: publicProfileWithActivityScoreSchema.array().max(5),
  week: publicProfileWithActivityScoreSchema.array().max(5),
  month: publicProfileWithActivityScoreSchema.array().max(5),
  quarter: publicProfileWithActivityScoreSchema.array().max(5),
  year: publicProfileWithActivityScoreSchema.array().max(5),
});

export const profilesStatsSchema = z.object({
  all: objectStatsWithAllSchema,
  active: objectStatsWithAllSchema,
});

export const postsStatsSchema = z.object({
  all: objectStatsWithAllSchema,
  withoutReply: objectStatsWithAllSchema,
  withReplies: objectStatsWithAllSchema,
  replies: objectStatsWithAllSchema,
});

export const interactionsStatsSchema = z.object({
  all: objectStatsWithAllSchema,
});

export const jamsStatsSchema = z.object({
  sessions: objectStatsWithAllSchema,
  participants: objectStatsWithAllSchema,
});

export const topListsStatsSchema: ZodObject<{
  posts: typeof topPostsSchema;
  profiles: typeof topProfilesSchema;
}> = z.object({
  posts: topPostsSchema,
  profiles: topProfilesSchema,
});

export const timelinesStatsSchema = z.object({
  signups: z.object({
    week: z
      .object({
        name: z.string(),
        count: z.number(),
      })
      .array(),
    fourWeeks: z
      .object({
        name: z.string(),
        count: z.number(),
      })
      .array(),
    fourMonths: z
      .object({
        name: z.string(),
        count: z.number(),
      })
      .array(),
  }),
});

export const serverCountsSchema = z.object({
  profiles: z.number(),
  posts: z.number(),
  events: z.number(),
  reactions: z.number(),
  rsvps: z.number(),
});

export type ServerCounts = z.infer<typeof serverCountsSchema>;

export const adminServerStatsSchema: ZodObject<{ profiles: typeof profilesStatsSchema; posts: typeof postsStatsSchema; interactions: typeof interactionsStatsSchema; jams: typeof jamsStatsSchema; topLists: typeof topListsStatsSchema; timelines: typeof timelinesStatsSchema }> = z.object({
  profiles: profilesStatsSchema,
  posts: postsStatsSchema,
  interactions: interactionsStatsSchema,
  jams: jamsStatsSchema,
  topLists: topListsStatsSchema,
  timelines: timelinesStatsSchema,
});

export type AdminServerStats = z.infer<typeof adminServerStatsSchema>;
