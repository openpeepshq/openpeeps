/**
 * Regression pin for the ingest catchup (round-5 review items 2 + 3):
 *
 *  - A row stamped `producer_outcome = 'stale'` (RAG was off when it was last
 *    edited) is re-queued by catchup, because the scan selects
 *    `producer_outcome IS DISTINCT FROM 'current'`. This is the mechanism that
 *    re-embeds a row once RAG re-enables — the `'stale'` stamp from `ingestRow`
 *    is what makes the row catchup-visible.
 *  - The profile scan carries the guest guard (`type <> 'guest'`), so guest
 *    rows are never backfilled even though the event path skips them —
 *    matching every other people surface.
 *
 * Only the SQL the worker issues and what it enqueues are asserted; Postgres,
 * BullMQ, and the probe report are mocked so no DB/Redis/network is opened.
 */
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

const { database, aiProbeReport, addBulk, held } = vi.hoisted(() => ({
  database: vi.fn(),
  aiProbeReport: vi.fn(),
  addBulk: vi.fn(async () => undefined),
  held: {
    catchup: undefined as
      | ((job: {
          data: { cursors?: Record<string, string> };
        }) => Promise<unknown>)
      | undefined,
  },
}));

vi.mock('../db', () => ({
  database: (...args: unknown[]) => database(...args),
}));
vi.mock('./probe', () => ({
  aiProbeReport: (...args: unknown[]) => aiProbeReport(...args),
}));
vi.mock('../jobs', () => ({
  // `../log` (imported by `ingest.ts`) registers a `log-retention` queue before
  // `ingest.ts` does, so key the capture on the queue name to grab catchup.
  queueAndWorker: vi.fn((name, proc) => {
    if (name === 'nlpIngestCatchup') held.catchup = proc;
    return [
      vi.fn(() => ({ add: vi.fn(), addBulk })),
      vi.fn(() => ({ on: vi.fn(), close: async () => undefined })),
    ];
  }),
  getOrCreateQueue: vi.fn(() => ({ add: vi.fn(async () => ({ id: '1' })) })),
}));

await import('./ingest');

const dialect = new PgDialect();
const render = (query: unknown) => dialect.sqlToQuery(query as never);
const spaceId = '90000000-0000-0000-0000-000000000001';
const postRowId = '11111111-1111-1111-1111-111111111111';
const profileRowId = '22222222-2222-2222-2222-222222222222';

describe('ingest catchup', () => {
  it('re-queues a stale post and excludes guest profiles from the scan', async () => {
    const catchupProcessor = held.catchup;
    expect(catchupProcessor).toBeTypeOf('function');

    aiProbeReport.mockReturnValue({
      embedding: 'off',
      transcription: 'off',
      sentiment: 'off',
      language: 'off',
      rag: 'ok',
      topics: 'off',
    });
    const seen: Array<{ sql: string; params: unknown[] }> = [];
    database.mockResolvedValue({
      execute: vi.fn(async (query: unknown) => {
        const { sql: s, params } = render(query);
        seen.push({ sql: s, params: params ?? [] });
        const upper = s.trim().toUpperCase();
        if (upper.startsWith('SELECT')) {
          if (s.includes('embedding_spaces'))
            return { rows: [{ id: spaceId }] };
          // The table name is a bind param (`FROM $1`), so route on params[0].
          const table = String(params?.[0] ?? '');
          if (table === 'posts') return { rows: [{ id: postRowId }] };
          if (table === 'profiles') return { rows: [{ id: profileRowId }] };
        }
        return { rows: [] };
      }),
    });

    const result = (await catchupProcessor!({ data: {} })) as {
      enqueued: number;
    };
    expect(result).toEqual({ enqueued: 2 });

    // Both rows are enqueued for ingest.
    expect(addBulk).toHaveBeenCalledTimes(2);
    const enqueuedIds = addBulk.mock.calls.flatMap((call) =>
      (call[0] as { data: { rowId: string } }[]).map((job) => job.data.rowId),
    );
    expect(enqueuedIds).toContain(postRowId);
    expect(enqueuedIds).toContain(profileRowId);

    // The profile scan carries the guest guard; the posts scan does not need it.
    const profileScan = seen.find((q) => q.params[0] === 'profiles');
    const postScan = seen.find((q) => q.params[0] === 'posts');
    expect(profileScan?.sql).toContain("profiles.type <> 'guest'");
    expect(postScan?.sql).not.toContain("type <> 'guest'");
    // Both scans re-queue non-current rows (the 'stale' re-embed mechanism).
    expect(profileScan?.sql).toContain(
      "producer_outcome IS DISTINCT FROM 'current'",
    );
    expect(postScan?.sql).toContain(
      "producer_outcome IS DISTINCT FROM 'current'",
    );
  });
});
