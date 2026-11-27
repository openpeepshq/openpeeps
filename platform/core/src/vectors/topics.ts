import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { aiConfig } from '../config';
import { database } from '../db';
import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import {
  cosineSimilarity,
  kMeans,
  TOPIC_SOURCE_TABLES,
  type TopicSourceTable,
} from './cluster';
import { vectorLiteral, rowText } from './constants';
import {
  providerClient,
  providerReady,
  providerSignal,
  readError,
} from './http';
import { aiProbeReport } from './probe';
import { writeEnrichment } from './storage';

const log = logger('app:vectors:topics');

type Point = {
  table: TopicSourceTable;
  id: string;
  embedding: number[];
  body: unknown;
};

const rowsOf = <T>(result: { rows: unknown }) => (result.rows ?? []) as T[];

const parseVector = (value: string) =>
  value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .filter((part) => part.length > 0)
    .map(Number);

const loadPoints = async (spaceId: string): Promise<Point[]> => {
  const db = await database();
  const points: Point[] = [];
  for (const table of TOPIC_SOURCE_TABLES) {
    const deleted =
      table === 'jam_transcripts'
        ? sql`true`
        : sql`${sql.raw(table)}.deleted_at IS NULL`;
    // Reuse the exact body expression `loadRow` in ingest embeds, so the text
    // fed to the labeling model is the same text the vector was built from:
    // posts/profiles use `body` (profiles materialize `handle` in, as ingest
    // does) and jam_transcripts stores its text in `segments`.
    const bodyExpr =
      table === 'jam_transcripts'
        ? sql`segments AS body`
        : table === 'profiles'
          ? sql`jsonb_set(body, '{handle}', to_jsonb(handle)) AS body`
          : sql`body AS body`;
    const result = await db.execute(sql`
      SELECT id::text AS id, embedding::text AS embedding, ${bodyExpr}
      FROM ${sql.raw(table)}
      WHERE embedding IS NOT NULL
        AND space_id = ${spaceId}::uuid
        AND ${deleted}
    `);
    rowsOf<{ id: string; embedding: string; body: unknown }>(result).forEach(
      (row) => {
        points.push({
          table,
          id: row.id,
          embedding: parseVector(row.embedding),
          body: row.body,
        });
      },
    );
  }
  return points;
};

/**
 * Asks the chat model to name a topic. Contract: the model should answer with
 * JSON `{"label": "...", "description": "..."}`; non-JSON replies are
 * truncated to 80 chars as the label with an empty description.
 */
const labelCentroid = async (
  samples: string[],
): Promise<{ label: string; description: string }> => {
  const settings = await aiConfig();
  if (!providerReady(settings.chat)) {
    return { label: 'Topic', description: '' };
  }
  const instruction =
    settings.topic_label_prompt ||
    'Name the shared subject of these posts. Reply as JSON with "label" and "description".';
  const client = providerClient(settings.chat);
  const response = await client.post('/chat/completions', {
    json: {
      model: settings.chat.model,
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: samples.slice(0, 8).join('\n---\n') },
      ],
    },
    signal: providerSignal(),
  });
  if (!response.ok) {
    throw new Error(
      `topic label request failed (${response.status}): ${await readError(response)}`,
    );
  }
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = body.choices?.[0]?.message?.content ?? '';
  try {
    const parsed = JSON.parse(text) as { label?: string; description?: string };
    return {
      label: parsed.label || 'Topic',
      description: parsed.description || '',
    };
  } catch {
    return { label: text.slice(0, 80) || 'Topic', description: '' };
  }
};

const activeSpaceId = async () => {
  const db = await database();
  const result = await db.execute(sql`
    SELECT id::text AS id FROM embedding_spaces
    WHERE space_scope = 'corpus' AND is_active = true
    LIMIT 1
  `);
  return rowsOf<{ id: string }>(result)[0]?.id;
};

export const assignTopic = async (embedding: number[], spaceId: string) => {
  const db = await database();
  const result = await db.execute(sql`
    SELECT centroids.topic_id, centroids.label, centroids.embedding::text AS embedding
    FROM topic_centroids centroids
    JOIN topic_catalogs catalogs ON catalogs.id = centroids.catalog_id
    WHERE catalogs.is_active = true AND catalogs.space_id = ${spaceId}::uuid
  `);
  const rows = rowsOf<{
    topic_id: number;
    label: string;
    embedding: string;
  }>(result);
  let best: { topicId: number; label: string; score: number } | undefined;
  rows.forEach((row) => {
    const score = cosineSimilarity(embedding, parseVector(row.embedding));
    if (!best || score > best.score) {
      best = { topicId: Number(row.topic_id), label: row.label, score };
    }
  });
  return best;
};

const [topicClusterQueue, topicClusterWorker] = queueAndWorker<
  { reason?: string },
  unknown
>('topicCluster', async () => {
  if (aiProbeReport().topics !== 'ok') return { skipped: true };
  const settings = await aiConfig();
  if (settings.cluster_use_umap) {
    log.warn('cluster_use_umap is set; clustering stays flat K-Means');
  }
  const spaceId = await activeSpaceId();
  if (!spaceId) return { skipped: true };
  const points = (await loadPoints(spaceId)).filter(
    (point) => point.embedding.length > 0,
  );
  const clustered = kMeans(
    points.map((point) => point.embedding),
    settings.topic_cluster_k,
  );
  if (clustered.centroids.length === 0) return { topics: 0 };

  const db = await database();
  const versionResult = await db.execute(sql`
    SELECT COALESCE(MAX(version), 0) AS version
    FROM topic_catalogs WHERE space_id = ${spaceId}::uuid
  `);
  const version =
    Number(rowsOf<{ version: number }>(versionResult)[0]?.version ?? 0) + 1;
  const catalogId = uuidv7();
  const labels = await Promise.all(
    clustered.centroids.map((_, index) =>
      labelCentroid(
        points
          .filter(
            (_, pointIndex) => clustered.assignments[pointIndex] === index,
          )
          // The model must see the post/profile/transcript text, not row ids:
          // the vector was built from this text, so the label has to be too.
          .map((point) => rowText(point.table, point.body))
          .filter((text) => text.length > 0),
      ),
    ),
  );

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO topic_catalogs (id, space_id, version, model_label, is_active)
      VALUES (
        ${catalogId}::uuid,
        ${spaceId}::uuid,
        ${version},
        ${settings.chat.model || 'k-means'},
        false
      )
    `);
    for (let index = 0; index < clustered.centroids.length; index += 1) {
      const centroid = clustered.centroids[index]!;
      const label = labels[index] ?? {
        label: `Topic ${index + 1}`,
        description: '',
      };
      const members = points.filter(
        (_, pointIndex) => clustered.assignments[pointIndex] === index,
      );
      await tx.execute(sql`
        INSERT INTO topic_centroids (
          id, catalog_id, topic_id, label, description, embedding, num_docs, score
        )
        VALUES (
          ${uuidv7()}::uuid,
          ${catalogId}::uuid,
          ${index},
          ${label.label},
          ${label.description},
          ${vectorLiteral(centroid)}::halfvec,
          ${members.length},
          0
        )
      `);
    }
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index]!;
      if (point.table !== 'posts') continue;
      const topicIndex = clustered.assignments[index] ?? 0;
      const label = labels[topicIndex];
      await writeEnrichment(
        point.id,
        'topics',
        {
          topicId: topicIndex,
          label: label?.label ?? `Topic ${topicIndex + 1}`,
        },
        spaceId,
        tx,
      );
    }
    await tx.execute(sql`
      UPDATE topic_catalogs SET is_active = false WHERE is_active = true
    `);
    await tx.execute(sql`
      UPDATE topic_catalogs SET is_active = true WHERE id = ${catalogId}::uuid
    `);
  });
  return { topics: clustered.centroids.length, version };
});

export const topicClusterJobQueue = topicClusterQueue;
export const topicClusterJobWorker = topicClusterWorker;

export const ensureTopicClusterSchedule = async () => {
  await topicClusterQueue().upsertJobScheduler(
    'topic-cluster-daily',
    { pattern: '15 4 * * *' },
    { name: 'cluster', data: { reason: 'schedule' } },
  );
};
