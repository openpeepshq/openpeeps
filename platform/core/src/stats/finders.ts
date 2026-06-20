import {
  AdminServerStats,
  PublicPostWithActivityScore,
  ObjectStatsWithAll,
  PublicProfileWithActivityScore,
  ServerCounts,
  publicProfileWithActivityScoreSchema,
  publicPostWithActivityScoreSchema,
} from '@openpeeps/common/types';
import { sub } from 'date-fns';
import type { PgDb } from '../db/pg/client';
import { baseProfilesMapping } from '../profiles';
import { allpeepDb } from '../db';
import {
  postsMapping,
  postsWithReplyCountMapping,
  postsWithReplyToCountMapping,
  transformPost,
} from '../posts';
import {
  entriesMapping,
  followsMapping,
  postsWithActivityScoreMapping,
  profileWithActivityScoreMapping,
  reactionsMapping,
  repostsMapping,
} from './mapping';
import { compileStatsWithAll, creationDateFilter } from './helpers';
import {
  jamParticipantsMapping,
  jamSessionStartsMapping,
} from '../jams/mapping';

export const activeProfilesCount = (db: PgDb, start?: Date, end?: Date) =>
  profileWithActivityScoreMapping(start, end)
    .filter('DOC.activityScore > 0')
    .count(db);
export const activeProfilesStats = (): Promise<ObjectStatsWithAll> =>
  compileStatsWithAll(activeProfilesCount);

export const profilesCount = (db: PgDb, start?: Date, end?: Date) =>
  baseProfilesMapping.filter(creationDateFilter(start, end)).count(db);
export const profileStats = (): Promise<ObjectStatsWithAll> =>
  compileStatsWithAll(profilesCount);

export const postsCount = (db: PgDb, start?: Date, end?: Date) =>
  postsMapping.filter(creationDateFilter(start, end)).count(db);
export const postsStats = (): Promise<ObjectStatsWithAll> =>
  compileStatsWithAll(postsCount);

export const eventsCount = (db: PgDb, start?: Date, end?: Date) =>
  postsMapping
    .filter(creationDateFilter(start, end))
    .filter({ matches: { type: 'event' } })
    .count(db);

export const postsWithoutReplyCount = (db: PgDb, start?: Date, end?: Date) =>
  postsWithReplyCountMapping
    .filter(creationDateFilter(start, end))
    .filter({ matches: { replyCount: 0 } })
    .count(db);
export const postsWithoutReplyStats = (): Promise<ObjectStatsWithAll> =>
  compileStatsWithAll(postsWithoutReplyCount);

export const postsWithRepliesCount = (db: PgDb, start?: Date, end?: Date) =>
  postsWithReplyCountMapping
    .filter(creationDateFilter(start, end))
    .filter('DOC.replyCount > 0')
    .count(db);
export const postsWithRepliesStats = (): Promise<ObjectStatsWithAll> =>
  compileStatsWithAll(postsWithRepliesCount);

export const postsRepliesCount = (db: PgDb, start?: Date, end?: Date) =>
  postsWithReplyToCountMapping
    .filter(creationDateFilter(start, end))
    .filter({ matches: { replyToCount: 1 } })
    .count(db);
export const postsRepliesStats = (): Promise<ObjectStatsWithAll> =>
  compileStatsWithAll(postsRepliesCount);

const reactionCount = (db: PgDb, start?: Date, end?: Date) =>
  reactionsMapping.filter(creationDateFilter(start, end)).count(db);
const rsvpCount = (db: PgDb, start?: Date, end?: Date) =>
  entriesMapping
    .filter(creationDateFilter(start, end))
    .filter('DOC.type == "rsvp"')
    .count(db);
const followCount = (db: PgDb, start?: Date, end?: Date) =>
  followsMapping.filter(creationDateFilter(start, end)).count(db);
const entryCount = (db: PgDb, start?: Date, end?: Date) =>
  entriesMapping.filter(creationDateFilter(start, end)).count(db);
const repostCount = (db: PgDb, start?: Date, end?: Date) =>
  repostsMapping.filter(creationDateFilter(start, end)).count(db);

const interactionsCount = async (db: PgDb, start?: Date, end?: Date) =>
  (await reactionCount(db, start, end)) +
  (await followCount(db, start, end)) +
  (await entryCount(db, start, end)) +
  (await repostCount(db, start, end));
export const interactionsStats = (): Promise<ObjectStatsWithAll> =>
  compileStatsWithAll(interactionsCount);

export const serverCounts = async (): Promise<ServerCounts> =>
  allpeepDb().then(async ({ db }) => {
    const [profiles, posts, events, reactions, rsvps] = await Promise.all([
      profilesCount(db),
      postsCount(db),
      eventsCount(db),
      reactionCount(db),
      rsvpCount(db),
    ]);

    return {
      profiles,
      posts,
      events,
      reactions,
      rsvps,
    };
  });

const jamSessionStarts = (db: PgDb, start?: Date, end?: Date) =>
  jamSessionStartsMapping.filter(creationDateFilter(start, end)).count(db);
export const jamSessionsStats = (): Promise<ObjectStatsWithAll> =>
  compileStatsWithAll(jamSessionStarts);

const jamParticipants = (db: PgDb, start?: Date, end?: Date) =>
  jamParticipantsMapping.filter(creationDateFilter(start, end)).count(db);
export const jamParticipantsStats = (): Promise<ObjectStatsWithAll> =>
  compileStatsWithAll(jamParticipants);

const topPosts = (
  db: PgDb,
  start: Date,
): Promise<PublicPostWithActivityScore[]> =>
  postsWithActivityScoreMapping
    .filter(creationDateFilter(start))
    .sort([['DOC.activityScore', 'DESC']])
    .limit(5)
    .all(db)
    .then((posts) => Promise.all(posts.map((post) => transformPost(post))))
    .then((posts) =>
      posts
        .map((post) => publicPostWithActivityScoreSchema.safeParse(post))
        .filter((result) => result.success)
        .map((result) => result.data),
    );

const topProfiles = (
  db: PgDb,
  start: Date,
): Promise<PublicProfileWithActivityScore[]> =>
  profileWithActivityScoreMapping(start, new Date())
    .sort([['DOC.activityScore', 'DESC']])
    .limit(5)
    .all(db)
    .then((profiles) =>
      profiles
        .map((profile) =>
          publicProfileWithActivityScoreSchema.safeParse(profile),
        )
        .filter((result) => result.success)
        .map((result) => result.data),
    );

export const topListsStats = () =>
  allpeepDb().then(async ({ db }) => ({
    posts: {
      day: await topPosts(db, sub(new Date(), { days: 1 })),
      week: await topPosts(db, sub(new Date(), { weeks: 1 })),
      month: await topPosts(db, sub(new Date(), { months: 1 })),
      quarter: await topPosts(db, sub(new Date(), { months: 3 })),
      year: await topPosts(db, sub(new Date(), { years: 1 })),
    },
    profiles: {
      day: await topProfiles(db, sub(new Date(), { days: 1 })),
      week: await topProfiles(db, sub(new Date(), { weeks: 1 })),
      month: await topProfiles(db, sub(new Date(), { months: 1 })),
      quarter: await topProfiles(db, sub(new Date(), { months: 3 })),
      year: await topProfiles(db, sub(new Date(), { years: 1 })),
    },
  }));

export const newProfilesForInterval = (start: Date, end: Date) =>
  allpeepDb().then(({ db }) =>
    baseProfilesMapping.filter(creationDateFilter(start, end)).count(db),
  );

const createIntervals = (duration: 'P1W' | 'P4W' | 'P120D') => {
  switch (duration) {
    case 'P1W':
      return [0, 1, 2, 3, 4, 5, 6]
        .map((i) => ({
          start: sub(new Date(), { days: i + 1 }),
          end: sub(new Date(), { days: i }),
        }))
        .map((interval) => ({
          name: interval.start.toISOString().split('T')[0],
          ...interval,
        }));
    case 'P4W':
      return [0, 1, 2, 3]
        .map((i) => ({
          start: sub(new Date(), { days: (i + 1) * 7 }),
          end: sub(new Date(), { days: i * 7 }),
        }))
        .map((interval) => ({
          name: `${interval.start.toISOString().split('T')[0]} - ${interval.end.toISOString().split('T')[0]}`,
          ...interval,
        }));
    case 'P120D':
      return [0, 1, 2, 3]
        .map((i) => ({
          start: sub(new Date(), { days: (i + 1) * 30 }),
          end: sub(new Date(), { days: i * 30 }),
        }))
        .map((interval) => ({
          name: `${interval.start.toISOString().split('T')[0]} - ${interval.end.toISOString().split('T')[0]}`,
          ...interval,
        }));
  }
};

export const signupsTimeline = (duration: 'P1W' | 'P4W' | 'P120D') =>
  Promise.all(
    createIntervals(duration).map((interval) =>
      newProfilesForInterval(interval.start, interval.end).then((count) => ({
        name: interval?.name,
        count,
      })),
    ),
  );

export const serverStats = async (): Promise<AdminServerStats> => ({
  profiles: {
    all: await profileStats(),
    active: await activeProfilesStats(),
  },
  posts: {
    all: await postsStats(),
    withoutReply: await postsWithoutReplyStats(),
    withReplies: await postsWithRepliesStats(),
    replies: await postsRepliesStats(),
  },
  interactions: {
    all: await interactionsStats(),
  },
  jams: {
    sessions: await jamSessionsStats(),
    participants: await jamParticipantsStats(),
  },
  topLists: await topListsStats(),
  timelines: {
    signups: {
      week: await signupsTimeline('P1W'),
      fourWeeks: await signupsTimeline('P4W'),
      fourMonths: await signupsTimeline('P120D'),
    },
  },
});
