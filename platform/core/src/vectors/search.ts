import { sql, type SQL } from 'drizzle-orm';
import type { AiReranker } from '@openpeepshq/common/types';
import { aiConfig } from '../config';
import { database } from '../db';
import { blocks } from '../db/pg/schema/edges';
import { profiles } from '../db/pg/schema/documents';
import {
  DEFAULT_EMBEDDING_INSTRUCTION,
  KB_QUERY_EMBEDDING_INSTRUCTION,
  vectorLiteral,
} from './constants';
import { embedQuery } from './embed';
import { aiProbeReport } from './probe';
import {
  hitVisibleTo,
  postVisibilitySql,
  type SearchRequester,
} from './visibility';

export const VECTOR_COLLECTIONS = [
  'posts',
  'profiles',
  'jams',
  'jam_transcripts',
  'community_knowledge',
] as const;

export type VectorCollection = (typeof VECTOR_COLLECTIONS)[number];

export type VectorSearchOptions = {
  collection: VectorCollection;
  k?: number;
  prefetch?: number;
};

export type VectorHit = {
  id: string;
  collection: VectorCollection;
  score: number;
  content: string;
  visibility?: string;
  creatorId?: string;
  groupIds?: string[];
};

type RawHit = {
  id: string;
  content: string | null;
  dense: number | string | null;
  lexical: number | string | null;
  visibility?: string | null;
  creator_id?: string | null;
  group_ids?: string[] | null;
};

const rowsOf = <T>(result: { rows: unknown }) => (result.rows ?? []) as T[];

const groupIdsSql = sql`COALESCE(
  (SELECT array_agg(pgroups.to_id)
   FROM post_groups pgroups
   WHERE pgroups.from_id = posts.id::text),
  ARRAY[]::text[]
)`;

const loadGroupIds = async (profileId?: string) => {
  if (!profileId) return [];
  const db = await database();
  const result = await db.execute(sql`
    SELECT to_id FROM user_groups WHERE from_id = ${profileId}
  `);
  return rowsOf<{ to_id: string }>(result).map((row) => row.to_id);
};

/** Both directions of the block edge, like the feed's `blockedPairIds`. */
const loadBlockedIds = async (profileId?: string) => {
  if (!profileId) return [];
  const db = await database();
  const result = await db.execute(sql`
    SELECT id FROM (
      SELECT to_id AS id FROM ${blocks} WHERE from_id = ${profileId}
      UNION
      SELECT from_id AS id FROM ${blocks} WHERE to_id = ${profileId}
    ) pairs
  `);
  return rowsOf<{ id: string }>(result).map((row) => row.id);
};

/**
 * SQL twin of the profile block edge in `hitVisibleTo`: hide a profile the
 * requester is blocked with, in either direction, like `profileSearchMapping`
 * does for the people surface.
 */
const profileBlockedSql = (profileId?: string): SQL =>
  profileId
    ? sql`NOT EXISTS (
        SELECT 1 FROM ${blocks} b
        WHERE (b."from_id" = ${profileId} AND b."to_id" = ${profiles.id}::text)
           OR (b."from_id" = ${profiles.id}::text AND b."to_id" = ${profileId})
      )`
    : sql`true`;

const lexicalExpr = (columnSql: ReturnType<typeof sql>, query: string) =>
  sql`COALESCE(ts_rank(${columnSql}, plainto_tsquery('english', ${query})), 0)`;

const searchPosts = async (
  literal: string,
  queryText: string | undefined,
  profileId: string | undefined,
  prefetch: number,
  jamsOnly: boolean,
) => {
  const db = await database();
  const lexical = queryText
    ? lexicalExpr(sql`posts.search_vector`, queryText)
    : sql`0`;
  const jamFilter = jamsOnly ? sql`AND posts.type = 'event'` : sql``;
  const result = await db.execute(sql`
    SELECT posts.id::text AS id,
           posts.body::text AS content,
           posts.visibility AS visibility,
           posts.creator_id AS creator_id,
           ${groupIdsSql} AS group_ids,
           1 - (posts.embedding <=> ${literal}::halfvec) AS dense,
           ${lexical} AS lexical
    FROM posts
    WHERE posts.embedding IS NOT NULL
      AND ${postVisibilitySql(profileId)}
      ${jamFilter}
    ORDER BY posts.embedding <=> ${literal}::halfvec
    LIMIT ${prefetch}
  `);
  return rowsOf<RawHit>(result);
};

const searchProfiles = async (
  literal: string,
  queryText: string | undefined,
  profileId: string | undefined,
  prefetch: number,
) => {
  const db = await database();
  const lexical = queryText
    ? lexicalExpr(sql`profiles.search_vector`, queryText)
    : sql`0`;
  const result = await db.execute(sql`
    SELECT profiles.id::text AS id,
           profiles.body::text AS content,
           1 - (profiles.embedding <=> ${literal}::halfvec) AS dense,
           ${lexical} AS lexical
    FROM profiles
    WHERE profiles.embedding IS NOT NULL
      AND profiles.deleted_at IS NULL
      AND profiles.type <> 'guest'
      AND ${profileBlockedSql(profileId)}
    ORDER BY profiles.embedding <=> ${literal}::halfvec
    LIMIT ${prefetch}
  `);
  return rowsOf<RawHit>(result);
};

const searchTranscripts = async (
  literal: string,
  queryText: string | undefined,
  profileId: string | undefined,
  prefetch: number,
) => {
  const db = await database();
  const lexical = queryText
    ? lexicalExpr(
        sql`to_tsvector('english', jam_transcripts.segments::text)`,
        queryText,
      )
    : sql`0`;
  const result = await db.execute(sql`
    SELECT jam_transcripts.id::text AS id,
           jam_transcripts.segments::text AS content,
           posts.visibility AS visibility,
           posts.creator_id AS creator_id,
           ${groupIdsSql} AS group_ids,
           1 - (jam_transcripts.embedding <=> ${literal}::halfvec) AS dense,
           ${lexical} AS lexical
    FROM jam_transcripts
    JOIN posts ON posts.id::text = jam_transcripts.jam_id
    WHERE jam_transcripts.embedding IS NOT NULL
      AND ${postVisibilitySql(profileId)}
    ORDER BY jam_transcripts.embedding <=> ${literal}::halfvec
    LIMIT ${prefetch}
  `);
  return rowsOf<RawHit>(result);
};

const searchKnowledge = async (
  literal: string,
  queryText: string | undefined,
  prefetch: number,
) => {
  const db = await database();
  const lexical = queryText
    ? lexicalExpr(
        sql`to_tsvector('english', community_knowledge.content)`,
        queryText,
      )
    : sql`0`;
  const result = await db.execute(sql`
    SELECT community_knowledge.id::text AS id,
           community_knowledge.content AS content,
           1 - (community_knowledge.embedding <=> ${literal}::halfvec) AS dense,
           ${lexical} AS lexical
    FROM community_knowledge
    WHERE community_knowledge.embedding IS NOT NULL
    ORDER BY community_knowledge.embedding <=> ${literal}::halfvec
    LIMIT ${prefetch}
  `);
  return rowsOf<RawHit>(result);
};

/**
 * P1b lexical rerank: fuse the dense cosine score with the `ts_rank` lexical
 * score, but only when the configured reranker is `lexical` and the query has
 * text. Any other reranker value yields a pure dense score.
 */
export const lexicalScore = (
  dense: number,
  lexical: number,
  reranker: AiReranker,
  queryText: string | undefined,
) =>
  reranker === 'lexical' && queryText ? dense * 0.75 + lexical * 0.25 : dense;

/**
 * Authorized ANN. Returns nothing when the embedding probe is not ok, so a
 * fingerprint mismatch or an empty AI config cannot leak or invent hits.
 * Rows are filtered again with `hitVisibleTo` after the SQL predicate.
 */
export const vectorSearch = async (
  query: string | number[],
  requester: { profileId?: string },
  options: VectorSearchOptions,
): Promise<VectorHit[]> => {
  if (aiProbeReport().rag !== 'ok') return [];
  const settings = await aiConfig();
  const prefetch = options.prefetch ?? 40;
  const k = options.k ?? 10;
  const queryText = typeof query === 'string' ? query : undefined;
  const instruction =
    options.collection === 'community_knowledge'
      ? KB_QUERY_EMBEDDING_INSTRUCTION
      : DEFAULT_EMBEDDING_INSTRUCTION;
  const embedding =
    typeof query === 'string' ? await embedQuery(query, instruction) : query;
  if (embedding.length === 0) return [];
  const literal = vectorLiteral(embedding);
  const profileId = requester.profileId;
  const raw =
    options.collection === 'profiles'
      ? await searchProfiles(literal, queryText, profileId, prefetch)
      : options.collection === 'jam_transcripts'
        ? await searchTranscripts(literal, queryText, profileId, prefetch)
        : options.collection === 'community_knowledge'
          ? await searchKnowledge(literal, queryText, prefetch)
          : await searchPosts(
              literal,
              queryText,
              profileId,
              prefetch,
              options.collection === 'jams',
            );
  const [groupIds, blockedIds] = await Promise.all([
    loadGroupIds(profileId),
    loadBlockedIds(profileId),
  ]);
  const resolved: SearchRequester = { profileId, groupIds, blockedIds };
  return raw
    .map((row) => ({
      id: row.id,
      collection: options.collection,
      content: row.content ?? '',
      visibility: row.visibility ?? undefined,
      creatorId: row.creator_id ?? undefined,
      groupIds: row.group_ids ?? [],
      score: lexicalScore(
        Number(row.dense ?? 0),
        Number(row.lexical ?? 0),
        settings.reranker,
        queryText,
      ),
    }))
    .filter((hit) => hitVisibleTo(hit, resolved))
    .sort((left, right) => right.score - left.score)
    .slice(0, k);
};
