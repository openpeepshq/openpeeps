/**
 * Regression pin for review suggestion 4: topic labeling must feed the chat
 * model the same plain text the row's embedding was built from — never the row
 * id. `loadPoints` reads each source row's body and `labelCentroid` maps it
 * through the shared `rowText`, so a regression back to sending `point.id`
 * (a UUID) is caught here.
 *
 * The topicCluster worker's processor runs for real; BullMQ, Postgres, config,
 * the probe report, and the provider HTTP client are mocked so no
 * Redis/DB/network is opened.
 */
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
import type { AiConfig } from '@openpeepshq/common/types';

const { aiConfig, database, fetchClient, holder } = vi.hoisted(() => ({
  aiConfig: vi.fn(),
  database: vi.fn(),
  fetchClient: vi.fn(),
  holder: {
    processor: undefined as
      | ((job: { data: { reason?: string } }) => Promise<unknown>)
      | undefined,
  },
}));

vi.mock('../db', () => ({
  database: (...args: unknown[]) => database(...args),
}));
vi.mock('../config', () => ({
  aiConfig: (...args: unknown[]) => aiConfig(...args),
}));
// The processor gates on the cached probe report; mock the module so it reads
// "ok" without running a real provider probe.
vi.mock('./probe', () => ({
  aiProbeReport: vi.fn(() => ({
    embedding: 'ok',
    transcription: 'off',
    sentiment: 'off',
    language: 'off',
    rag: 'ok',
    topics: 'ok',
  })),
}));
// Capture the processor without instantiating a real BullMQ Queue/Worker.
vi.mock('../jobs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../jobs')>();
  return {
    ...actual,
    // `../log` (imported by `topics.ts`) registers a `log-retention` queue
    // before `topics.ts` does, so key the capture on the queue name.
    queueAndWorker: vi.fn((name, proc) => {
      if (name === 'topicCluster') holder.processor = proc;
      return [vi.fn(() => ({})), vi.fn(() => ({}))];
    }),
  };
});
// `writeEnrichment` runs inside the write transaction for posts; no-op it so
// the transaction can complete without a real DB.
vi.mock('./storage', () => ({
  writeEnrichment: vi.fn(async () => undefined),
}));
// Mock at the provider HTTP boundary so labelCentroid's request is captured.
vi.mock('@openpeepshq/fetch-client', () => ({
  fetchClient: (...args: unknown[]) => fetchClient(...args),
}));

const { rowText } = await import('./constants');
await import('./topics'); // registers the captured processor

const dialect = new PgDialect();
const spaceId = '90000000-0000-7000-8000-000000000001';
const postRowId = '11111111-1111-1111-1111-111111111111';

describe('topic labeling input', () => {
  it('sends the row text (not the row id) to the labeling model', async () => {
    const postText = 'Shipping the new onboarding flow today';
    const postBody = { content: postText };

    aiConfig.mockResolvedValue({
      cluster_use_umap: false,
      topic_cluster_k: 1,
      topic_label_prompt: '',
      chat: {
        endpoint: 'https://chat.example',
        credential: 'key',
        model: 'chat-model',
      },
    } satisfies Partial<AiConfig> as AiConfig);

    database.mockResolvedValue({
      execute: vi.fn(async (query: unknown) => {
        const rendered = dialect.sqlToQuery(query as never).sql;
        if (rendered.includes('embedding_spaces')) {
          return { rows: [{ id: spaceId }] };
        }
        if (rendered.includes('MAX(version)')) {
          return { rows: [{ version: 3 }] };
        }
        if (rendered.includes('FROM posts')) {
          return {
            rows: [{ id: postRowId, embedding: '[1,0,0]', body: postBody }],
          };
        }
        return { rows: [] };
      }),
      transaction: vi.fn(
        async (
          fn: (tx: {
            execute: (q: unknown) => Promise<unknown>;
          }) => Promise<unknown>,
        ) => fn({ execute: async () => ({ rows: [] }) }),
      ),
    });

    const captured: {
      payload: { json?: { messages?: { role: string; content: string }[] } };
    } = { payload: {} };
    fetchClient.mockReturnValue({
      post: async (_url: string, opts: { json?: unknown }) => {
        captured.payload = opts as typeof captured.payload;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: '{"label":"Onboarding","description":"new flow"}',
                },
              },
            ],
          }),
          text: async () => '',
        };
      },
    });

    const result = await holder.processor!({ data: { reason: 'test' } });
    expect(result).toEqual({ topics: 1, version: 4 });

    const user = captured.payload.json?.messages?.find(
      (m) => m.role === 'user',
    )?.content;
    expect(user).toBe(rowText('posts', postBody));
    expect(user).toBe(postText);
    // The row id must never be the labeling input.
    expect(user).not.toContain(postRowId);
  });
});
