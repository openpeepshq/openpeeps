/**
 * Regression pin for the nlpIngest dead-letter path (round-3 review item 2).
 * The worker's final-attempt failure handler must write the `dlq:nlpIngest`
 * audit record even when every AI probe is off — the state after an admin
 * clears the embedding/sidecar config while a job is mid-retry. The handler
 * must enqueue the DLQ directly, not through the probe-gated
 * `enqueueNlpIngest`, which returns early when all probes are off and would
 * silently drop the record.
 *
 * The external boundaries are mocked (BullMQ queues/worker, Postgres, config
 * loader) so no Redis or database connection is opened. The real `./ingest`
 * module — including the `worker.on('failed', ...)` DLQ wiring — runs.
 */
import { describe, expect, it, vi } from 'vitest';

const { database, aiConfig, captured, dlqAdd } = vi.hoisted(() => ({
  database: vi.fn(),
  aiConfig: vi.fn(),
  captured: {} as Record<string, (job: unknown, error: unknown) => void>,
  dlqAdd: vi.fn(async () => ({ id: '1' })),
}));

vi.mock('../db', () => ({
  database: (...args: unknown[]) => database(...args),
}));
vi.mock('../config', () => ({
  aiConfig: (...args: unknown[]) => aiConfig(...args),
}));
// Capture the failed handler without creating a real BullMQ Worker, and stub
// the DLQ queue accessor so no Redis connection is opened. Everything else in
// `../jobs` stays real.
vi.mock('../jobs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../jobs')>();
  return {
    ...actual,
    queueAndWorker: vi.fn(() => [
      vi.fn(() => ({ add: vi.fn() })),
      vi.fn(() => ({
        on: (
          event: string,
          handler: (job: unknown, error: unknown) => void,
        ) => {
          if (event === 'failed') captured.failed = handler;
        },
        close: async () => undefined,
      })),
    ]),
    getOrCreateQueue: vi.fn(() => ({ add: dlqAdd })),
  };
});

const { nlpIngestJobWorker } = await import('./ingest');

describe('nlpIngest dead-letter path', () => {
  it('writes the DLQ record on final failure even with every probe off', async () => {
    // Every probe reports off, as after an admin clears the AI config while a
    // job is mid-retry. `enqueueNlpIngest` would return early here; the DLQ
    // record must still be written directly by the failure handler.
    aiConfig.mockResolvedValue({});
    database.mockResolvedValue({
      execute: vi.fn(async () => ({ rows: [] })),
    });

    const worker = nlpIngestJobWorker();
    void worker; // building the worker is what attaches the failed handler
    expect(captured.failed).toBeTypeOf('function');
    captured.failed!(
      {
        data: { table: 'posts', rowId: '11111111-1111-1111-1111-111111111111' },
        attemptsMade: 5,
        opts: { attempts: 5 },
      },
      new Error('embedding provider 500'),
    );
    // The handler voids its `dlqAdd` / `markError` promises; let them settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dlqAdd).toHaveBeenCalledWith(
      'dead',
      expect.objectContaining({
        table: 'posts',
        rowId: '11111111-1111-1111-1111-111111111111',
        error: 'embedding provider 500',
      }),
    );
    void worker;
  });
});
