/**
 * Regression pins for the RAG-off ingest contract (round-5 review item 5,
 * reinforcing item 2):
 *
 *  - When RAG is off, `ingestRow` stamps the row `producer_outcome = 'stale'`
 *    (not `'current'`), keeping the previous embedding. A `'current'` stamp
 *    would pass the idempotency skip and keep a stale vector after RAG
 *    re-enables with the same active space; a `'stale'` row is re-queued by
 *    catchup (which selects `producer_outcome IS DISTINCT FROM 'current'`).
 *  - A row that already carries the same content hash stamped `'stale'` is up
 *    to date for the off-state, so `ingestRow` skips the redundant re-stamp.
 *  - `enqueueNlpIngest` enqueues even when every probe is off, as long as RAG
 *    is *configured* (`rag_enabled`) — that is what makes a row edited during a
 *    RAG-off window get stamped `'stale'` and become catchup-visible. With RAG
 *    not configured it returns without enqueuing.
 *
 * Boundaries (Postgres, BullMQ, config, probes, embedding) are mocked so no
 * DB/Redis/network is opened.
 */
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
import type { AiConfig } from '@openpeepshq/common/types';

const { aiConfig, database, aiProbeReport, ingestAdd, held } = vi.hoisted(
  () => ({
    aiConfig: vi.fn(),
    database: vi.fn(),
    aiProbeReport: vi.fn(),
    ingestAdd: vi.fn(async () => ({ id: '1' })),
    held: {
      nlpIngest: undefined as
        | ((job: {
            data: { table: string; rowId: string };
          }) => Promise<unknown>)
        | undefined,
    },
  }),
);

vi.mock('../db', () => ({
  database: (...args: unknown[]) => database(...args),
}));
vi.mock('../config', () => ({
  aiConfig: (...args: unknown[]) => aiConfig(...args),
}));
vi.mock('./probe', () => ({
  aiProbeReport: (...args: unknown[]) => aiProbeReport(...args),
}));
vi.mock('./embed', () => ({
  embedTexts: vi.fn(async () => [[0.1, 0.2]]),
}));
vi.mock('./storage', () => ({
  writeEnrichment: vi.fn(async () => undefined),
}));
vi.mock('./topics', () => ({
  assignTopic: vi.fn(async () => undefined),
}));
vi.mock('../jobs', () => ({
  // `../log` (imported by `ingest.ts`) registers a `log-retention` queue before
  // `ingest.ts` does, so key the capture on the queue name rather than call
  // order to grab `ingestRow`.
  queueAndWorker: vi.fn((name, proc) => {
    if (name === 'nlpIngest') held.nlpIngest = proc;
    return [
      vi.fn(() => ({ add: ingestAdd, addBulk: vi.fn() })),
      vi.fn(() => ({ on: vi.fn(), close: async () => undefined })),
    ];
  }),
  getOrCreateQueue: vi.fn(() => ({ add: vi.fn(async () => ({ id: '1' })) })),
}));

const { enqueueNlpIngest } = await import('./ingest');
const { contentHash, rowText, DEFAULT_EMBEDDING_INSTRUCTION } = await import(
  './constants'
);

const dialect = new PgDialect();
const render = (query: unknown) => dialect.sqlToQuery(query as never);
const rowId = '11111111-1111-1111-1111-111111111111';
const body = { content: 'edited post body' };
const spaceId = '90000000-0000-0000-0000-000000000001';

const offProbe = {
  embedding: 'off',
  transcription: 'off',
  sentiment: 'off',
  language: 'off',
  rag: 'off',
  topics: 'off',
};

describe('RAG-off ingest stamp', () => {
  it("stamps the row 'stale' (keeping the embedding) when RAG is off", async () => {
    aiConfig.mockResolvedValue({} as AiConfig);
    aiProbeReport.mockReturnValue(offProbe);
    const updates: Array<{ sql: string; params: unknown[] }> = [];
    // A previously-embedded row, now edited: content hash no longer matches,
    // outcome still 'current'.
    const row = {
      id: rowId,
      body,
      indexed_content_hash: 'old-hash',
      producer_outcome: 'current',
      space_id: spaceId,
    };
    database.mockResolvedValue({
      execute: vi.fn(async (query: unknown) => {
        const { sql: s } = render(query);
        if (s.trim().toUpperCase().startsWith('SELECT')) {
          return { rows: [row] };
        }
        if (s.trim().toUpperCase().startsWith('UPDATE')) {
          updates.push(render(query));
          return { rows: [] };
        }
        return { rows: [] };
      }),
    });

    const result = await held.nlpIngest!({
      data: { table: 'posts', rowId },
    });
    expect(result).toEqual({ labeled: true });
    expect(updates).toHaveLength(1);
    // The UPDATE sets producer_outcome to the 'stale' literal (the 2nd bind
    // param), not 'current'.
    expect(updates[0].sql).toContain('producer_outcome = $2');
    expect(updates[0].params?.[1]).toBe('stale');
    // Keeps the previous embedding (not NULL'd) — only the outcome changes.
    expect(updates[0].sql).toContain('embedding = embedding');
    expect(updates[0].sql).not.toContain('embedding = NULL');
  });

  it('skips the redundant re-stamp when the row is already stale for this content', async () => {
    aiConfig.mockResolvedValue({} as AiConfig);
    aiProbeReport.mockReturnValue(offProbe);
    const updates: string[] = [];
    const hash = contentHash(
      DEFAULT_EMBEDDING_INSTRUCTION,
      rowText('posts', body),
    );
    const row = {
      id: rowId,
      body,
      indexed_content_hash: hash,
      producer_outcome: 'stale',
      space_id: spaceId,
    };
    database.mockResolvedValue({
      execute: vi.fn(async (query: unknown) => {
        const { sql: s } = render(query);
        if (s.trim().toUpperCase().startsWith('SELECT')) return { rows: [row] };
        if (s.trim().toUpperCase().startsWith('UPDATE')) {
          updates.push(s);
          return { rows: [] };
        }
        return { rows: [] };
      }),
    });

    const result = await held.nlpIngest!({
      data: { table: 'posts', rowId },
    });
    expect(result).toEqual({ skipped: true });
    expect(updates).toHaveLength(0);
  });
});

describe('enqueueNlpIngest RAG-off gate', () => {
  it('enqueues to stamp the row when every probe is off but RAG is configured', async () => {
    aiProbeReport.mockReturnValue(offProbe);
    aiConfig.mockResolvedValue({ rag_enabled: true } as AiConfig);
    ingestAdd.mockClear();
    await enqueueNlpIngest('posts', rowId);
    expect(ingestAdd).toHaveBeenCalledWith('ingest', {
      table: 'posts',
      rowId,
    });
  });

  it('does not enqueue when every probe is off and RAG is not configured', async () => {
    aiProbeReport.mockReturnValue(offProbe);
    aiConfig.mockResolvedValue({ rag_enabled: false } as AiConfig);
    ingestAdd.mockClear();
    await enqueueNlpIngest('posts', rowId);
    expect(ingestAdd).not.toHaveBeenCalled();
  });

  it('enqueues when the RAG probe is ok, regardless of configuration', async () => {
    aiProbeReport.mockReturnValue({ ...offProbe, rag: 'ok' });
    aiConfig.mockResolvedValue({ rag_enabled: false } as AiConfig);
    ingestAdd.mockClear();
    await enqueueNlpIngest('posts', rowId);
    expect(ingestAdd).toHaveBeenCalledWith('ingest', {
      table: 'posts',
      rowId,
    });
  });
});
