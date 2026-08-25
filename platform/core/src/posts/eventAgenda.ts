import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
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
  PostWithMeta,
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
};

const occurrenceTimeFilter = (window: EventAgendaWindow, now: string): SQL => {
  const start = eventOccurrences.start;
  const end = eventOccurrences.end;
  if (window === 'upcoming') {
    return or(gt(start, now), and(isNotNull(end), gt(end, now)))!;
  }
  if (window === 'current') {
    return and(lte(start, now), or(isNull(end), gte(end, now)))!;
  }
  return sql`COALESCE(${end}, ${start}) < ${now}`;
};

const eventAgendaConditions = ({
  window,
  now,
  jamOnly,
  mine,
  groupId,
  profileId,
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
  return conditions;
};

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
