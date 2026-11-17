import {
  notInArray,
  and,
  asc,
  desc,
  eq,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type {
  AuthorizationData,
  DbPost,
  EventRangeQueryParams,
  PostWithMeta,
} from '@openpeepshq/common/types';
import {
  EVENT_RANGE_DEFAULT_LIMIT,
  EVENT_RANGE_MAX_SPAN_MS,
} from '@openpeepshq/common/types';
import { canReadPost } from './helpers/filters';
import { transformPost } from './helpers';
import { allpeepDb, type PgDb } from '../db';
import { capabilitiesConfig } from '../config';
import { normalizeComputedDatetime } from '../db/pg/mappers';
import { eventOccurrences, posts } from '../db/pg/schema';
import { postGroups } from '../db/pg/schema/edges';
import { postHasYesOrMaybeRsvpExpr } from '../db/pg/queries';
import { postFilters } from '../db/pg/filters';
import { fetchRowsByIds, hydrateMapData } from '../db/pg/map/relations';
import { postsMappingForProfile } from './mapping';
import { blockedPairIds } from '@openpeepshq/common/lib';

export type EventAgendaWindow = 'upcoming' | 'current' | 'past';

export type EventAgendaOptions = {
  offset?: number;
  limit?: number;
  jamOnly?: boolean;
  mine?: boolean;
  groupId?: string;
};

export type EventAgendaQueryArgs = {
  window: EventAgendaWindow;
  now: string;
  offset: number;
  limit: number;
  jamOnly?: boolean;
  mine?: boolean;
  groupId?: string;
  profileId?: string;
  excludeCreatorIds?: string[];
};

/** Query params of the date-range event feeds (calendar). */
export type EventRangeOptions = {
  jamOnly?: boolean;
  mine?: boolean;
  groupId?: string;
};

export type EventRangeQueryArgs = {
  from: string;
  to: string;
  offset: number;
  limit: number;
  jamOnly?: boolean;
  mine?: boolean;
  groupId?: string;
  profileId?: string;
  excludeCreatorIds?: string[];
};

const occurrenceTimeFilter = (window: EventAgendaWindow, now: string): SQL => {
  const start = eventOccurrences.start;
  const end = eventOccurrences.end;
  if (window === 'upcoming') {
    // Still this occurrence until it ends. A missing end counts as one hour,
    // same as the current and past windows.
    return sql`COALESCE(${end}, ${start} + interval '1 hour') >= ${now}`;
  }
  if (window === 'current') {
    // A missing end is treated as a one-hour event, not an infinite one.
    return and(
      lte(start, now),
      sql`COALESCE(${end}, ${start} + interval '1 hour') >= ${now}`,
    )!;
  }
  return sql`COALESCE(${end}, ${start} + interval '1 hour') < ${now}`;
};

const eventRangeTimeFilter = (from: string, to: string): SQL =>
  and(
    sql`${eventOccurrences.start} < ${to}`,
    sql`COALESCE(${eventOccurrences.end}, ${eventOccurrences.start} + interval '1 hour') >= ${from}`,
  )!;

const eventAgendaConditions = ({
  window,
  now,
  jamOnly,
  mine,
  groupId,
  profileId,
  excludeCreatorIds,
}: EventAgendaQueryArgs): SQL[] => {
  const conditions: SQL[] = [
    isNull(posts.deletedAt),
    eq(posts.type, 'event'),
    eq(eventOccurrences.cancelled, false),
    occurrenceTimeFilter(window, now),
  ];
  if (jamOnly) {
    conditions.push(isNotNull(sql`${posts.body}->'jam'`));
  }
  if (mine && profileId) {
    conditions.push(
      or(
        eq(posts.creatorId, profileId),
        postFilters.isJamModerator(profileId).where,
        postHasYesOrMaybeRsvpExpr(posts, profileId),
      )!,
    );
  }
  if (groupId) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${postGroups} WHERE ${postGroups.fromId} = ${posts.id}::text AND ${postGroups.toId} = ${groupId})`,
    );
  }
  if (excludeCreatorIds?.length) {
    conditions.push(notInArray(posts.creatorId, excludeCreatorIds));
  }
  return conditions;
};

const rangeAgendaConditions = ({
  from,
  to,
  jamOnly,
  mine,
  groupId,
  profileId,
  excludeCreatorIds,
}: EventRangeQueryArgs): SQL[] => [
  isNull(posts.deletedAt),
  eq(posts.type, 'event'),
  eq(eventOccurrences.cancelled, false),
  eventRangeTimeFilter(from, to),
  ...(jamOnly ? [isNotNull(sql`${posts.body}->'jam'`)] : []),
  ...(mine && profileId
    ? [
        or(
          eq(posts.creatorId, profileId),
          postFilters.isJamModerator(profileId).where,
          postHasYesOrMaybeRsvpExpr(posts, profileId),
        )!,
      ]
    : []),
  ...(groupId
    ? [
        sql`EXISTS (SELECT 1 FROM ${postGroups} WHERE ${postGroups.fromId} = ${posts.id}::text AND ${postGroups.toId} = ${groupId})`,
      ]
    : []),
  ...(excludeCreatorIds?.length
    ? [notInArray(posts.creatorId, excludeCreatorIds)]
    : []),
];

/** One row per occurrence overlapping [from, to), ordered by start. */
export const eventRangeOccurrenceQuery = (
  db: Pick<PgDb, 'select'>,
  args: EventRangeQueryArgs,
) =>
  db
    .select({
      postId: eventOccurrences.postId,
      recurrenceId: eventOccurrences.recurrenceId,
      start: eventOccurrences.start,
      end: eventOccurrences.end,
    })
    .from(eventOccurrences)
    .innerJoin(posts, eq(posts.id, eventOccurrences.postId))
    .where(and(...rangeAgendaConditions(args)))
    // Ties on start (two series at the same instant) need a stable
    // tiebreaker or LIMIT/OFFSET pages would shuffle between requests.
    .orderBy(
      asc(eventOccurrences.start),
      asc(eventOccurrences.postId),
      asc(eventOccurrences.recurrenceId),
    )
    .limit(args.limit)
    .offset(args.offset);

// One row per event: a daily series would otherwise fill the first page.
export const eventAgendaOccurrenceQuery = (
  db: Pick<PgDb, 'select' | 'selectDistinctOn'>,
  args: EventAgendaQueryArgs,
) => {
  const pickOrder =
    args.window === 'past'
      ? desc(eventOccurrences.start)
      : asc(eventOccurrences.start);
  const distinctOccurrences = db
    .selectDistinctOn([eventOccurrences.postId], {
      postId: eventOccurrences.postId,
      recurrenceId: eventOccurrences.recurrenceId,
      start: eventOccurrences.start,
      end: eventOccurrences.end,
    })
    .from(eventOccurrences)
    .innerJoin(posts, eq(posts.id, eventOccurrences.postId))
    .where(and(...eventAgendaConditions(args)))
    .orderBy(eventOccurrences.postId, pickOrder)
    .as('event_agenda');
  return db
    .select({
      postId: distinctOccurrences.postId,
      recurrenceId: distinctOccurrences.recurrenceId,
      start: distinctOccurrences.start,
      end: distinctOccurrences.end,
    })
    .from(distinctOccurrences)
    .orderBy(
      args.window === 'past'
        ? desc(distinctOccurrences.start)
        : asc(distinctOccurrences.start),
    )
    .limit(args.limit)
    .offset(args.offset);
};

const loadPostsByIds = async (
  ids: string[],
  authData: AuthorizationData,
): Promise<Map<string, PostWithMeta>> => {
  if (ids.length === 0) return new Map();
  const profile = authData.profile;
  const { db } = await allpeepDb();
  const mapData = postsMappingForProfile(profile).data();
  const rows = await fetchRowsByIds(
    db,
    mapData.collection,
    ids,
    mapData.softDelete,
  );
  const hydrated = (await hydrateMapData(
    db,
    mapData,
    rows,
  )) as unknown as DbPost[];
  const config = await capabilitiesConfig();
  const readable = canReadPost(config, authData);
  const entries = await Promise.all(
    hydrated.map(async (post) => {
      const transformed = await transformPost(post, profile);
      return readable(transformed) ? transformed : undefined;
    }),
  );
  return new Map(
    entries
      .filter((post): post is PostWithMeta => !!post)
      .map((post) => [post.id, post]),
  );
};

export const listEventsInRange = async (
  authData: AuthorizationData,
  params: EventRangeQueryParams,
  { jamOnly = false, mine = false, groupId }: EventRangeOptions = {},
): Promise<PostWithMeta[]> => {
  const fromMs = new Date(params.from).getTime();
  const toMs = new Date(params.to).getTime();
  if (
    Number.isNaN(fromMs) ||
    Number.isNaN(toMs) ||
    fromMs >= toMs ||
    toMs - fromMs > EVENT_RANGE_MAX_SPAN_MS
  ) {
    throw new Error(
      'listEventsInRange requires from < to with a span of at most 62 days',
    );
  }
  const offset = params.offset ?? 0;
  const limit = params.limit ?? EVENT_RANGE_DEFAULT_LIMIT;
  const { db } = await allpeepDb();
  const rows = await eventRangeOccurrenceQuery(db, {
    from: params.from,
    to: params.to,
    offset,
    limit,
    jamOnly,
    mine,
    groupId,
    profileId: authData.profile?.id,
    excludeCreatorIds: blockedPairIds(authData.profile),
  });
  const postsById = await loadPostsByIds(
    [...new Set(rows.map((row) => row.postId))],
    authData,
  );

  return rows.flatMap((row) => {
    const post = postsById.get(row.postId);
    if (!post) return [];
    const occurrenceRecurrenceId = normalizeComputedDatetime(row.recurrenceId);
    const occurrenceStart = normalizeComputedDatetime(row.start);
    const occurrenceEnd = normalizeComputedDatetime(row.end);
    if (!occurrenceRecurrenceId || !occurrenceStart) return [];
    return [
      {
        ...post,
        occurrenceRecurrenceId,
        occurrenceStart,
        ...(occurrenceEnd ? { occurrenceEnd } : {}),
      },
    ];
  });
};

export const listEventAgenda = async (
  authData: AuthorizationData,
  window: EventAgendaWindow,
  {
    offset = 0,
    limit = 100,
    jamOnly = false,
    mine = false,
    groupId,
  }: EventAgendaOptions = {},
): Promise<PostWithMeta[]> => {
  const { db } = await allpeepDb();
  const now = new Date().toISOString();
  const rows = await eventAgendaOccurrenceQuery(db, {
    window,
    now,
    offset,
    limit,
    jamOnly,
    mine,
    groupId,
    profileId: authData.profile?.id,
    excludeCreatorIds: blockedPairIds(authData.profile),
  });
  const postsById = await loadPostsByIds(
    [...new Set(rows.map((row) => row.postId))],
    authData,
  );

  return rows.flatMap((row) => {
    const post = postsById.get(row.postId);
    if (!post) return [];
    const occurrenceRecurrenceId = normalizeComputedDatetime(row.recurrenceId);
    const occurrenceStart = normalizeComputedDatetime(row.start);
    const occurrenceEnd = normalizeComputedDatetime(row.end);
    if (!occurrenceRecurrenceId || !occurrenceStart) return [];
    return [
      {
        ...post,
        occurrenceRecurrenceId,
        occurrenceStart,
        ...(occurrenceEnd ? { occurrenceEnd } : {}),
      },
    ];
  });
};
