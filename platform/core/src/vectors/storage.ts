import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { database } from '../db';
import { getOrCreateQueue, queueAndWorker } from '../jobs';
import { logger } from '../log';
import { KB_DOCUMENT_EMBEDDING_INSTRUCTION, vectorLiteral } from './constants';
import { embedTexts } from './embed';
import { aiProbeReport } from './probe';

const log = logger('app:vectors:storage');

const CHUNK = 800;

type SqlExecutor = {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
};

export const writeEnrichment = async (
  postId: string,
  key: string,
  value: unknown,
  spaceId: string | null,
  executor?: SqlExecutor,
) => {
  const db = executor ?? (await database());
  const patch = JSON.stringify({ [key]: value });
  const space = spaceId ? sql`${spaceId}::uuid` : sql`NULL`;
  await db.execute(sql`
    INSERT INTO post_enrichments (id, post_id, space_id, enrichments, updated_at)
    VALUES (${uuidv7()}::uuid, ${postId}, ${space}, ${patch}::jsonb, now())
    ON CONFLICT (post_id) DO UPDATE SET
      enrichments = post_enrichments.enrichments || EXCLUDED.enrichments,
      space_id = COALESCE(EXCLUDED.space_id, post_enrichments.space_id),
      updated_at = now()
  `);
};

export type AiReportInput = {
  ownerProfileId: string;
  slug: string;
  title: string;
  kind: string;
  config?: unknown;
};

export type ReportJobData = { reportId: string };

const [reportQueue, reportWorker] = queueAndWorker<ReportJobData, unknown>(
  'reportJob',
  async (job) => {
    log.info({ reportId: job.data.reportId }, 'report job scaffold');
    return { pending: true };
  },
);

export const reportJobQueue = reportQueue;
export const reportJobWorker = reportWorker;

/** Inserts the report row, then enqueues the scaffold job. */
export const createAiReport = async (input: AiReportInput) => {
  const id = uuidv7();
  const db = await database();
  await db.execute(sql`
    INSERT INTO ai_reports (
      id, owner_profile_id, slug, title, kind, status, html_body, config
    )
    VALUES (
      ${id}::uuid,
      ${input.ownerProfileId},
      ${input.slug},
      ${input.title},
      ${input.kind},
      'pending',
      '',
      ${JSON.stringify(input.config ?? {})}::jsonb
    )
  `);
  await reportQueue().add('report', { reportId: id });
  return id;
};

export const createAiReportSchedule = async (input: {
  reportId: string;
  cron: string;
  nextRun?: string | null;
}) => {
  const id = uuidv7();
  const db = await database();
  await db.execute(sql`
    INSERT INTO ai_report_schedules (id, report_id, cron, next_run)
    VALUES (
      ${id}::uuid,
      ${input.reportId}::uuid,
      ${input.cron},
      ${input.nextRun ?? null}
    )
  `);
  return id;
};

export const jamAnalysisQueue = () => getOrCreateQueue('jam-analysis');

/** Row is committed before the plugin job is enqueued. */
export const createJamAnalysis = async (input: {
  jamId: string;
  recordingId?: string | null;
  config?: unknown;
}) => {
  const id = uuidv7();
  const db = await database();
  await db.execute(sql`
    INSERT INTO jam_analyses (id, jam_id, recording_id, status, html_body, config)
    VALUES (
      ${id}::uuid,
      ${input.jamId},
      ${input.recordingId ?? null},
      'pending',
      '',
      ${JSON.stringify(input.config ?? {})}::jsonb
    )
  `);
  await jamAnalysisQueue().add('analyse', {
    analysisId: id,
    jamId: input.jamId,
  });
  return id;
};

export const upsertKnowledgeDocument = async (input: {
  slug: string;
  filename: string;
  body: string;
}) => {
  const db = await database();
  const existing = await db.execute(sql`
    SELECT id::text AS id, version FROM knowledge_base_documents WHERE slug = ${input.slug}
  `);
  const row = (existing.rows as { id: string; version: number }[])[0];
  if (!row) {
    const id = uuidv7();
    await db.execute(sql`
      INSERT INTO knowledge_base_documents (id, slug, filename, body, version)
      VALUES (${id}::uuid, ${input.slug}, ${input.filename}, ${input.body}, 1)
    `);
    return id;
  }
  await db.execute(sql`
    UPDATE knowledge_base_documents
    SET filename = ${input.filename},
        body = ${input.body},
        version = ${Number(row.version) + 1},
        updated_at = now()
    WHERE id = ${row.id}::uuid
  `);
  return row.id;
};

const chunksOf = (body: string) => {
  const parts = body.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';
  parts.forEach((part) => {
    const piece = part.trim();
    if (!piece) return;
    if (`${current}\n\n${piece}`.trim().length > CHUNK && current) {
      chunks.push(current.trim());
      current = piece;
      return;
    }
    current = current ? `${current}\n\n${piece}` : piece;
  });
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

const reindexDocument = async (doc: { id: string; body: string }) => {
  const chunks = chunksOf(doc.body);
  const db = await database();
  await db.execute(sql`
    DELETE FROM community_knowledge WHERE doc_id = ${doc.id}::uuid
  `);
  if (chunks.length === 0) return;
  const embeddings = await embedTexts(
    chunks,
    KB_DOCUMENT_EMBEDDING_INSTRUCTION,
  );
  for (let index = 0; index < chunks.length; index += 1) {
    const content = chunks[index]!;
    const embedding = embeddings[index];
    if (!embedding) continue;
    await db.execute(sql`
      INSERT INTO community_knowledge (id, doc_id, chunk_id, content, embedding)
      VALUES (
        ${uuidv7()}::uuid,
        ${doc.id}::uuid,
        ${String(index)},
        ${content},
        ${vectorLiteral(embedding)}::halfvec
      )
    `);
  }
};

const [kbReindexQueue, kbReindexWorker] = queueAndWorker<
  { docId?: string },
  unknown
>('kbReindex', async (job) => {
  if (aiProbeReport().embedding !== 'ok') {
    log.info('skipping KB reindex; embedding probe is not ok');
    return { skipped: true };
  }
  const db = await database();
  const result = job.data.docId
    ? await db.execute(sql`
        SELECT id::text AS id, body FROM knowledge_base_documents
        WHERE id = ${job.data.docId}::uuid
      `)
    : await db.execute(sql`
        SELECT id::text AS id, body FROM knowledge_base_documents
      `);
  const docs = (result.rows as { id: string; body: string }[]) ?? [];
  for (const doc of docs) {
    await reindexDocument(doc);
  }
  return { documents: docs.length };
});

export const kbReindexJobQueue = kbReindexQueue;
export const kbReindexJobWorker = kbReindexWorker;

export const enqueueKbReindex = (docId?: string) =>
  kbReindexQueue().add('reindex', { docId });
