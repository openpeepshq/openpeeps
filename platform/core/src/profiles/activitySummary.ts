import {
  AuthorizationData,
  DbPost,
  PostWithMeta,
  ProfileActivitySummary,
  profileActivitySummarySchema,
  publicPostWithActivityScoreSchema,
} from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import type { PgDb } from '../db/pg/client';
import { fetchRowsByIds, hydrateMapData } from '../db/pg/map/relations';
import { capabilitiesConfig } from '../config';
import { canReadPost, transformPost } from '../posts/helpers';
import { postsMappingForProfile } from '../posts/mapping';
import {
  profileActivityCountsSql,
  profileTopPostScoresSql,
  takeTopReadablePosts,
} from './activityQueries';

type SqlRows = { rows: Record<string, unknown>[] };

const sqlRows = (result: unknown): Record<string, unknown>[] =>
  (result as SqlRows).rows ?? [];

const loadPostsByIds = async (
  db: PgDb,
  ids: string[],
  authData: AuthorizationData,
): Promise<PostWithMeta[]> => {
  if (ids.length === 0) return [];
  const mapData = postsMappingForProfile(authData.profile).data();
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
  const byId = new Map(
    await Promise.all(
      hydrated.map(async (post) => {
        const transformed = await transformPost(post, authData.profile);
        return [transformed.id, transformed] as const;
      }),
    ),
  );
  return ids
    .map((id) => byId.get(id))
    .filter((post): post is PostWithMeta => !!post);
};

export const getProfileActivitySummary = async (
  authData: AuthorizationData,
  profileId: string,
): Promise<ProfileActivitySummary> => {
  const { db } = await allpeepDb();
  const [countRow] = sqlRows(
    await db.execute(profileActivityCountsSql(profileId)),
  );
  const scored = sqlRows(await db.execute(profileTopPostScoresSql(profileId)))
    .map((row) => ({
      id: String(row.id ?? ''),
      activityScore: Number(row.activity_score ?? 0),
    }))
    .filter((row) => row.id);

  const scoreById = new Map(scored.map((row) => [row.id, row.activityScore]));
  const loaded = await loadPostsByIds(
    db,
    scored.map((row) => row.id),
    authData,
  );
  const config = await capabilitiesConfig();
  const readable = canReadPost(config, authData);
  const topPosts = takeTopReadablePosts(loaded, readable)
    .map((post) =>
      publicPostWithActivityScoreSchema.safeParse({
        ...post,
        activityScore: scoreById.get(post.id) ?? 0,
      }),
    )
    .filter((result) => result.success)
    .map((result) => result.data);

  return profileActivitySummarySchema.parse({
    postsCount: Number(countRow?.posts_count ?? 0),
    repliesCount: Number(countRow?.replies_count ?? 0),
    eventsCount: Number(countRow?.events_count ?? 0),
    reactionsGiven: Number(countRow?.reactions_given ?? 0),
    reactionsReceived: Number(countRow?.reactions_received ?? 0),
    repostsCount: Number(countRow?.reposts_count ?? 0),
    repostsReceived: Number(countRow?.reposts_received ?? 0),
    repliesReceived: Number(countRow?.replies_received ?? 0),
    rsvpsCount: Number(countRow?.rsvps_count ?? 0),
    bookmarksCount: Number(countRow?.bookmarks_count ?? 0),
    groupsCount: Number(countRow?.groups_count ?? 0),
    topPosts,
  });
};
