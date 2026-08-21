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
  PostWithMeta,
} from '@openpeepshq/common/types';
import { canReadPost } from './helpers/filters';
import { transformPost } from './helpers';
import { allpeepDb } from '../db';
import { capabilitiesConfig } from '../config';
import { normalizeComputedDatetime } from '../db/pg/mappers';
import { eventOccurrences, posts } from '../db/pg/schema';
import { postGroups } from '../db/pg/schema/edges';
import { postHasYesOrMaybeRsvpExpr } from '../db/pg/queries';
import { postFilters } from '../db/pg/filters';
import { fetchRowsByIds, hydrateMapData } from '../db/pg/map/relations';
import { postsMappingForProfile } from './mapping';
import type { DbPost } from '@openpeepshq/common/types';

export type EventAgendaWindow = 'upcoming' | 'current' | 'past';

export type EventAgendaOptions = {
  offset?: number;
  limit?: number;
  jamOnly?: boolean;
  mine?: boolean;
  groupId?: string;
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
  const conditions: SQL[] = [
    isNull(posts.deletedAt),
    eq(posts.type, 'event'),
    eq(eventOccurrences.cancelled, false),
    occurrenceTimeFilter(window, now),
  ];
  if (jamOnly) {
    conditions.push(isNotNull(sql`${posts.body}->'jam'`));
  }
  if (mine && authData.profile) {
    const profileId = authData.profile.id;
    conditions.push(
      or(
        eq(posts.creatorId, profileId),
        postFilters.isJamModerator(profileId).where,
        postHasYesOrMaybeRsvpExpr(posts, profileId),
      )!,
    );
  }

  const order =
    window === 'past'
      ? desc(eventOccurrences.start)
      : asc(eventOccurrences.start);

  const baseQuery = db
    .select({
      postId: eventOccurrences.postId,
      recurrenceId: eventOccurrences.recurrenceId,
      start: eventOccurrences.start,
      end: eventOccurrences.end,
    })
    .from(eventOccurrences)
    .innerJoin(posts, eq(posts.id, eventOccurrences.postId));

  const filtered = groupId
    ? baseQuery
        .innerJoin(
          postGroups,
          and(
            eq(postGroups.fromId, sql`${posts.id}::text`),
            eq(postGroups.toId, groupId),
          ),
        )
        .where(and(...conditions))
    : baseQuery.where(and(...conditions));

  const rows = await filtered.orderBy(order).limit(limit).offset(offset);
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
