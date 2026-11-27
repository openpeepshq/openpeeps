/**
 * Regression pin for the `vectorSearch` fail-closed contract (round-5 review
 * item 5): an authorized ANN must return nothing when the RAG probe is not
 * `ok`, so a fingerprint mismatch or an empty AI config cannot leak or invent
 * hits. The happy path is covered to confirm the guard is on the gate, not a
 * blanket `return []`. Boundaries (Postgres, config, probe, embedding) are
 * mocked so no DB/Redis/network is opened.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AiConfig } from '@openpeepshq/common/types';

const { aiConfig, database, aiProbeReport, embedQuery } = vi.hoisted(() => ({
  aiConfig: vi.fn(),
  database: vi.fn(),
  aiProbeReport: vi.fn(),
  embedQuery: vi.fn(),
}));

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
  embedQuery: (...args: unknown[]) => embedQuery(...args),
}));

const { vectorSearch } = await import('./search');

describe('vectorSearch fail-closed contract', () => {
  it('returns [] when the RAG probe is not ok, before any provider/DB call', async () => {
    aiProbeReport.mockReturnValue({ rag: 'off' });
    aiConfig.mockResolvedValue({} as AiConfig);
    database.mockResolvedValue({ execute: vi.fn(async () => ({ rows: [] })) });
    embedQuery.mockResolvedValue([0.1, 0.2]);

    const hits = await vectorSearch('query', {}, { collection: 'posts' });
    expect(hits).toEqual([]);
    // The gate fires before anything else: no config, no DB, no embed.
    expect(aiConfig).not.toHaveBeenCalled();
    expect(database).not.toHaveBeenCalled();
    expect(embedQuery).not.toHaveBeenCalled();
  });

  it('returns scored hits when the RAG probe is ok', async () => {
    aiProbeReport.mockReturnValue({ rag: 'ok' });
    aiConfig.mockResolvedValue({ reranker: 'none' } as AiConfig);
    database.mockResolvedValue({
      execute: vi.fn(async () => ({
        rows: [
          {
            id: 'a1',
            content: 'hi',
            dense: 0.9,
            lexical: 0.1,
            visibility: 'public',
            creator_id: null,
            group_ids: null,
          },
        ],
      })),
    });
    embedQuery.mockResolvedValue([0.1, 0.2]);

    const hits = await vectorSearch(
      'query',
      { profileId: 'p1' },
      {
        collection: 'posts',
      },
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.id).toBe('a1');
    expect(hits[0]?.content).toBe('hi');
    expect(hits[0]?.score).toBeCloseTo(0.9);
  });
});
