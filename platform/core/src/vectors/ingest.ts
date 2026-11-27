import { sql } from 'drizzle-orm';
import { aiConfig } from '../config';
import { database } from '../db';
import { getOrCreateQueue, queueAndWorker } from '../jobs';
import { logger } from '../log';
import {
  contentHash,
  DEFAULT_EMBEDDING_INSTRUCTION,
  rowText,
  vectorLiteral,
  type IngestTableName,
} from './constants';
import { embedTexts } from './embed';
import { isHttpUrl, providerClient, providerSignal } from './http';
import { aiProbeReport } from './probe';
import { writeEnrichment } from './storage';
import { assignTopic } from './topics';

const log = logger('app:vectors:ingest');

export type IngestTable = IngestTableName;

export type NlpIngestJob = {
  table: IngestTable;
  rowId: string;
};

const rowsOf = <T>(result: { rows: unknown }) => (result.rows ?? []) as T[];

type SourceRow = {
  id: string;
  body: unknown;
  indexed_content_hash: string | null;
  producer_outcome: string | null;
  space_id: string | null;
};

const nlpIngestDlq = () => getOrCreateQueue('dlq:nlpIngest');

const activeSpace = async () => {
  const db = await database();
  const result = await db.execute(sql`
    SELECT id::text AS id FROM embedding_spaces
    WHERE space_scope = 'corpus' AND is_active = true
    LIMIT 1
  `);
  return rowsOf<{ id: string }>(result)[0]?.id ?? null;
};

const loadRow = async (table: IngestTable, rowId: string) => {
  const db = await database();
  const result =
    table === 'jam_transcripts'
      ? await db.execute(sql`
          SELECT id::text AS id, segments AS body,
                 indexed_content_hash, producer_outcome, space_id::text AS space_id
          FROM jam_transcripts WHERE id = ${rowId}::uuid
        `)
      : table === 'profiles'
        ? await db.execute(sql`
            SELECT id::text AS id,
                   jsonb_set(body, '{handle}', to_jsonb(handle)) AS body,
                   indexed_content_hash, producer_outcome, space_id::text AS space_id
            FROM profiles WHERE id = ${rowId}::uuid
          `)
        : await db.execute(sql`
            SELECT id::text AS id, body,
                   indexed_content_hash, producer_outcome, space_id::text AS space_id
            FROM posts WHERE id = ${rowId}::uuid
          `);
  return rowsOf<SourceRow>(result)[0];
};

/**
 * Sentiment/language sidecar contract: POST the request body `{ text }` and
 * respond with a JSON object carrying either `{ "label": "..." }` or
 * `{ "result": "..." }` (the first key present wins). Any other shape
 * yields no enrichment label for that row.
 */
const classify = async (endpoint: string, credential: string, text: string) => {
  if (!isHttpUrl(endpoint)) return undefined;
  const client = providerClient({ endpoint, credential, model: 'sidecar' });
  const response = await client.post('', {
    json: { text },
    signal: providerSignal(),
  });
  if (!response.ok) {
    throw new Error(`sidecar classification failed (${response.status})`);
  }
  const body = (await response.json()) as { label?: string; result?: string };
  return body.label ?? body.result;
};

const stamp = async (
  table: IngestTable,
  rowId: string,
  hash: string,
  outcome: string,
  spaceId: string | null,
  embedding?: number[] | null,
) => {
  const db = await database();
  const vector =
    embedding === undefined
      ? sql`embedding`
      : embedding === null
        ? sql`NULL`
        : sql`${vectorLiteral(embedding)}::halfvec`;
  const space = spaceId ? sql`${spaceId}::uuid` : sql`space_id`;
  await db.execute(sql`
    UPDATE ${sql.raw(table)}
    SET indexed_content_hash = ${hash},
        producer_outcome = ${outcome},
        space_id = ${space},
        embedding = ${vector},
        updated_at = now()
    WHERE id = ${rowId}::uuid
  `);
};

const ingestRow = async (job: NlpIngestJob) => {
  const settings = await aiConfig();
  const probe = aiProbeReport();
  const row = await loadRow(job.table, job.rowId);
  if (!row) return { missing: true };
  const text = rowText(job.table, row.body);
  const hash = contentHash(DEFAULT_EMBEDDING_INSTRUCTION, text);
  const spaceId = probe.rag === 'ok' ? await activeSpace() : null;
  if (
    row.indexed_content_hash === hash &&
    row.producer_outcome === 'current' &&
    (probe.rag !== 'ok' || row.space_id === spaceId)
  ) {
    return { skipped: true };
  }

  if (job.table === 'posts' && probe.sentiment === 'ok') {
    const label = await classify(
      settings.sentiment.endpoint,
      settings.sentiment.credential,
      text,
    );
    if (label) await writeEnrichment(row.id, 'sentiment', { label }, spaceId);
  }
  if (job.table === 'posts' && probe.language === 'ok') {
    const label = await classify(
      settings.language.endpoint,
      settings.language.credential,
      text,
    );
    if (label) await writeEnrichment(row.id, 'language', { label }, spaceId);
  }

  if (probe.rag !== 'ok' || !spaceId) {
    // 'stale' (not 'current'): the stored embedding was built while RAG was on
    // and may no longer match this content. 'current' would pass the idempotency
    // skip on re-ingest, and catchup only re-queues rows whose outcome or
    // space changed, so a row edited while RAG was off would otherwise keep
    // its stale vector after RAG re-enables with the same active space.
    // A row that already carries this exact hash stamped 'stale' is up to date
    // for the off-state (there is no embedding to write while RAG is off), so
    // skip the redundant re-stamp — it would otherwise repeat on every
    // catchup pass and duplicate event for the same content.
    if (row.indexed_content_hash === hash && row.producer_outcome === 'stale') {
      return { skipped: true };
    }
    await stamp(job.table, row.id, hash, 'stale', row.space_id, undefined);
    return { labeled: true };
  }
  if (!text) {
    await stamp(job.table, row.id, hash, 'current', spaceId, null);
    return { empty: true };
  }

  const [embedding] = await embedTexts([text], DEFAULT_EMBEDDING_INSTRUCTION);
  if (!embedding) throw new Error('embedding provider returned no vector');
  await stamp(job.table, row.id, hash, 'current', spaceId, embedding);
  if (job.table === 'posts' && probe.topics === 'ok') {
    const topic = await assignTopic(embedding, spaceId);
    if (topic) await writeEnrichment(row.id, 'topics', topic, spaceId);
  }
  return { embedded: true };
};

const markError = async (job: NlpIngestJob) => {
  const db = await database();
  await db.execute(sql`
    UPDATE ${sql.raw(job.table)}
    SET producer_outcome = 'error'
    WHERE id = ${job.rowId}::uuid
  `);
};

let dlqAttached = false;

const [nlpIngestQueue, nlpIngestWorkerBase] = queueAndWorker<
  NlpIngestJob,
  unknown
>('nlpIngest', async (job) => ingestRow(job.data), {
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { age: 86400 * 7, count: 100 },
  },
});

export const nlpIngestJobQueue = nlpIngestQueue;

export const nlpIngestJobWorker = () => {
  const worker = nlpIngestWorkerBase();
  if (!dlqAttached) {
    dlqAttached = true;
    worker.on('failed', (job, error) => {
      const attempts = job?.opts.attempts ?? 1;
      if (!job || job.attemptsMade < attempts) return;
      const data = job.data;
      void nlpIngestDlq()
        .add('dead', { ...data, error: error.message })
        .catch((dlqError) =>
          log.error({ err: dlqError }, 'dlq enqueue failed'),
        );
      void markError(data).catch((stampError) =>
        log.error({ err: stampError }, 'failed to stamp ingest error'),
      );
    });
  }
  return worker;
};

export const enqueueNlpIngest = async (table: IngestTable, rowId: string) => {
  const probe = aiProbeReport();
  if (
    probe.rag === 'ok' ||
    probe.sentiment === 'ok' ||
    probe.language === 'ok'
  ) {
    // A probe is currently serving this feature; ingest it as usual.
  } else {
    // Nothing is 'ok', but RAG may still be *configured* (enabled in the AI
    // config while its embedding probe is 'off' — e.g. a transient provider
    // failure or fingerprint mismatch). In that case run the job so it can
    // stamp `producer_outcome = 'stale'` on the row (see ingestRow); that is
    // what makes a row edited during a RAG-off window get re-embedded when RAG
    // re-enables, since catchup re-queues rows whose outcome is not 'current'.
    // Gating only on 'ok' would skip the stamp and leave the row invisible to
    // catchup, so its stale vector would be served until the next edit.
    // `rag_enabled` is the admin-intent signal (the probe only reflects the
    // current 'ok'/'off' state, not whether RAG is meant to be on).
    const settings = await aiConfig();
    if (!settings.rag_enabled) return;
  }
  await nlpIngestQueue().add('ingest', { table, rowId });
};

const CATCHUP_BATCH = 100;

const UUID_ZERO = '00000000-0000-0000-0000-000000000000';

type CatchupCursors = { posts?: string; profiles?: string };

/** Posts and profiles both carry an embedding column; backfill both. */
const CATCHUP_TABLES: Array<{
  table: IngestTable;
  column: 'posts' | 'profiles';
  key: 'posts' | 'profiles';
  /** Extra row filter, e.g. the profile guest guard. */
  where?: import('drizzle-orm').SQL;
}> = [
  { table: 'posts', column: 'posts', key: 'posts' },
  {
    table: 'profiles',
    column: 'profiles',
    key: 'profiles',
    // Guest profiles are never embedded: the event path skips them and every
    // other people surface does too. The backfill must match that, or guest
    // rows get vectors on first catchup and are then served by searchProfiles.
    where: sql`profiles.type <> 'guest'`,
  },
];

const [nlpIngestCatchupQueue, nlpIngestCatchupWorkerFn] = queueAndWorker<
  { cursors?: CatchupCursors },
  unknown
>('nlpIngestCatchup', async (job) => {
  if (aiProbeReport().rag !== 'ok') return { skipped: true };
  const spaceId = await activeSpace();
  if (!spaceId) return { skipped: true };
  const db = await database();
  // Clear any guest-profile vector that a previous run embedded before the
  // guest guard existed. Idempotent: once cleared it stays cleared (the scan
  // below never re-selects guest rows).
  await db.execute(sql`
    UPDATE profiles SET embedding = NULL, updated_at = now()
    WHERE type = 'guest' AND embedding IS NOT NULL
  `);
  const cursors = job.data.cursors ?? {};
  const next: CatchupCursors = {};
  let enqueued = 0;
  let more = false;
  for (const { table, column, key, where } of CATCHUP_TABLES) {
    const cursor = cursors[key] ?? UUID_ZERO;
    const result = await db.execute(sql`
      SELECT id::text AS id FROM ${column}
      WHERE deleted_at IS NULL
        AND id > ${cursor}::uuid
        AND (
          producer_outcome IS DISTINCT FROM 'current'
          OR space_id IS DISTINCT FROM ${spaceId}::uuid
        )
        AND ${where ?? sql`true`}
      ORDER BY id
      LIMIT ${CATCHUP_BATCH}
    `);
    const ids = rowsOf<{ id: string }>(result).map((row) => row.id);
    if (ids.length === 0) {
      next[key] = cursor; // caught up; keep position
      continue;
    }
    enqueued += ids.length;
    await nlpIngestQueue().addBulk(
      ids.map((rowId, index) => ({
        name: 'ingest',
        data: { table, rowId },
        opts: { delay: index * 50 },
      })),
    );
    next[key] = ids[ids.length - 1];
    if (ids.length === CATCHUP_BATCH) more = true;
  }
  if (more) {
    await nlpIngestCatchupQueue().add('catchup', { cursors: next });
  }
  return { enqueued };
});

export const nlpIngestCatchupQueueHandle = nlpIngestCatchupQueue;
export const nlpIngestCatchupWorker = nlpIngestCatchupWorkerFn;

export const enqueueNlpCatchup = async () => {
  const queue = nlpIngestCatchupQueue();
  const existing = await queue.getJob('nlp-catchup');
  if (existing) {
    const state = await existing.getState();
    if (state === 'completed' || state === 'failed') await existing.remove();
    else return;
  }
  await queue.add('catchup', {}, { jobId: 'nlp-catchup' });
};
