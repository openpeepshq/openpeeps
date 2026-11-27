import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { idColumn, halfvec } from './base';

const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`);

const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`);

/** Fingerprint of an embedding instruction space. One active row per scope. */
export const embeddingSpaces = pgTable(
  'embedding_spaces',
  {
    id: idColumn(),
    model: text('model').notNull(),
    instruction: text('instruction').notNull(),
    dimension: integer('dimension').notNull(),
    spaceScope: text('space_scope').notNull(),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('embedding_spaces_one_active_scope')
      .on(t.spaceScope)
      .where(sql`${t.isActive} = true`),
  ],
);

/** One enrichment document per post. Top-level keys are namespaced. */
export const postEnrichments = pgTable(
  'post_enrichments',
  {
    id: idColumn(),
    postId: text('post_id').notNull(),
    spaceId: uuid('space_id'),
    enrichments: jsonb('enrichments').notNull().default({}),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('post_enrichments_post_unique').on(t.postId)],
);

export const jamTranscripts = pgTable(
  'jam_transcripts',
  {
    id: idColumn(),
    jamId: text('jam_id').notNull(),
    recordingId: text('recording_id').notNull(),
    segments: jsonb('segments').notNull().default([]),
    embedding: halfvec('embedding'),
    indexedContentHash: text('indexed_content_hash'),
    producerOutcome: text('producer_outcome'),
    spaceId: uuid('space_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('jam_transcripts_jam_idx').on(t.jamId),
    uniqueIndex('jam_transcripts_recording_unique').on(t.recordingId),
    index('jam_transcripts_embedding_cosine_idx').using(
      'hnsw',
      t.embedding.op('halfvec_cosine_ops'),
    ),
  ],
);

export const knowledgeBaseDocuments = pgTable(
  'knowledge_base_documents',
  {
    id: idColumn(),
    slug: text('slug').notNull(),
    filename: text('filename').notNull(),
    body: text('body').notNull(),
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('knowledge_base_documents_slug_unique').on(t.slug)],
);

export const communityKnowledge = pgTable(
  'community_knowledge',
  {
    id: idColumn(),
    docId: uuid('doc_id').notNull(),
    chunkId: text('chunk_id').notNull(),
    content: text('content').notNull(),
    embedding: halfvec('embedding'),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('community_knowledge_doc_idx').on(t.docId),
    uniqueIndex('community_knowledge_doc_chunk_unique').on(t.docId, t.chunkId),
    index('community_knowledge_embedding_cosine_idx').using(
      'hnsw',
      t.embedding.op('halfvec_cosine_ops'),
    ),
  ],
);

export const topicCatalogs = pgTable(
  'topic_catalogs',
  {
    id: idColumn(),
    spaceId: uuid('space_id').notNull(),
    version: integer('version').notNull(),
    modelLabel: text('model_label').notNull(),
    createdBy: text('created_by'),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index('topic_catalogs_space_idx').on(t.spaceId),
    uniqueIndex('topic_catalogs_one_active')
      .on(t.isActive)
      .where(sql`${t.isActive} = true`),
  ],
);

export const topicCentroids = pgTable(
  'topic_centroids',
  {
    id: idColumn(),
    catalogId: uuid('catalog_id').notNull(),
    topicId: integer('topic_id').notNull(),
    label: text('label').notNull(),
    description: text('description').notNull().default(''),
    embedding: halfvec('embedding').notNull(),
    numDocs: integer('num_docs').notNull().default(0),
    score: doublePrecision('score').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index('topic_centroids_catalog_idx').on(t.catalogId),
    index('topic_centroids_embedding_cosine_idx').using(
      'hnsw',
      t.embedding.op('halfvec_cosine_ops'),
    ),
  ],
);

/** AI-generated reports. Distinct from the moderation `reports` table. */
export const aiReports = pgTable(
  'ai_reports',
  {
    id: idColumn(),
    ownerProfileId: text('owner_profile_id').notNull(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    kind: text('kind').notNull(),
    status: text('status').notNull().default('pending'),
    htmlBody: text('html_body').notNull().default(''),
    config: jsonb('config').notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('ai_reports_slug_unique').on(t.slug)],
);

export const aiReportSchedules = pgTable(
  'ai_report_schedules',
  {
    id: idColumn(),
    reportId: uuid('report_id').notNull(),
    cron: text('cron').notNull(),
    nextRun: timestamp('next_run', { withTimezone: true, mode: 'string' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('ai_report_schedules_report_idx').on(t.reportId)],
);

export const jamAnalyses = pgTable(
  'jam_analyses',
  {
    id: idColumn(),
    jamId: text('jam_id').notNull(),
    recordingId: text('recording_id'),
    status: text('status').notNull().default('pending'),
    htmlBody: text('html_body').notNull().default(''),
    config: jsonb('config').notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('jam_analyses_jam_idx').on(t.jamId)],
);
