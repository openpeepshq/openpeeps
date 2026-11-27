import { createHash } from 'node:crypto';
import { EMBEDDING_DIMENSIONS } from '../db/pg/schema/base';

export { EMBEDDING_DIMENSIONS };

/**
 * Symmetric instruction for posts, profiles, and transcripts.
 * Changing it invalidates every stored corpus vector.
 * Copied from the peeps-ai embedding client; not admin-configurable.
 *
 * Profile rows embed `handle + textFromBody`: `rowText` (ingest) synthesizes a
 * `{ handle, body }` row and `loadRow` materializes the handle via
 * `jsonb_set`, so the embedded text carries the handle plus the same
 * `name`/`title`/`content`/... keys `TEXT_KEYS` extracts — mirroring profile
 * search on the people surface.
 */
export const DEFAULT_EMBEDDING_INSTRUCTION =
  'Instruct: Represent this community content for grouping by subject matter, ' +
  'ignoring tone, greetings, and who wrote it\nQuery:';

/** Knowledge-base documents are embedded plain. Paired with the query instruction. */
export const KB_DOCUMENT_EMBEDDING_INSTRUCTION = '';

export const KB_QUERY_EMBEDDING_INSTRUCTION =
  "Instruct: Given a question about this community's rules, features, or " +
  'guidelines, retrieve the reference passages that answer it\nQuery:';

export const CORPUS_SCOPE = 'corpus';
export const KNOWLEDGE_SCOPE = 'knowledge_base';

/** The model concatenates instruction and text with no extra separator. */
export const applyInstruction = (instruction: string, text: string) =>
  `${instruction}${text}`;

export const contentHash = (instruction: string, text: string) =>
  createHash('sha256').update(`${instruction}\n${text}`).digest('hex');

export const vectorLiteral = (values: number[]) => {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('embedding contains a non-finite value');
  }
  return `[${values.join(',')}]`;
};

const TEXT_KEYS = [
  'name',
  'title',
  'content',
  'spoilerText',
  'description',
  'summary',
];

export const textFromBody = (body: unknown): string => {
  if (!body || typeof body !== 'object') return '';
  const record = body as Record<string, unknown>;
  return TEXT_KEYS.map((key) => record[key])
    .filter((value): value is string => typeof value === 'string')
    .map((value) =>
      value
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((value) => value.length > 0)
    .join('\n');
};

export type IngestTableName = 'posts' | 'profiles' | 'jam_transcripts';

/**
 * The plain text of a source row for the given table. Shared by ingest (what
 * gets embedded) and topic clustering (what the labeling model sees), so the
 * model is fed the same text the vector was built from — never row ids.
 */
export const rowText = (table: IngestTableName, body: unknown): string => {
  if (table === 'jam_transcripts' && Array.isArray(body)) {
    return body
      .map((segment) =>
        segment && typeof segment === 'object' && 'text' in segment
          ? String((segment as { text: unknown }).text ?? '')
          : '',
      )
      .filter(Boolean)
      .join('\n');
  }
  if (table === 'profiles' && body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const handle = typeof record.handle === 'string' ? record.handle : '';
    return [handle, textFromBody(body)].filter(Boolean).join('\n');
  }
  return textFromBody(body);
};
