/**
 * Pinned at the core level: the drafts read path (round-7 review suggestion 3).
 * `listMyDrafts` must query the author's unpublished drafts only: the default
 * `published()` gate is removed, `postFilters.drafts()` plus a creator-scoped
 * filter are applied, and rows are ordered newest-first. The publish suite
 * covers capabilities; this pins the finder's query contract itself.
 */
import { describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL, SQLWrapper } from 'drizzle-orm';

const dialect = new PgDialect();
const renderSql = (value: unknown): string => {
  if (value == null) return '';
  const query = dialect.sqlToQuery((value as SQLWrapper).getSQL());
  return query.sql + ' ' + JSON.stringify(query.params);
};

type MappingData = {
  defaultFilter?: unknown;
  filters: Array<Record<string, unknown>>;
  sort?: unknown;
};

let captured: MappingData | undefined;

vi.mock('../db', async (importOriginal) => ({
  ...(await importOriginal()),
  allpeepDb: vi.fn().mockResolvedValue({ db: {} }),
}));
vi.mock('./helpers', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    toFilteredPostsList: vi.fn(async (mapping: { data: () => MappingData }) => {
      captured = mapping.data();
      return [];
    }),
  };
});

const { listMyDrafts } = await import('./finders');

const filterSqls = (mapping: MappingData): string[] =>
  mapping.filters.map((filter) =>
    'kind' in filter && filter.kind === 'sql'
      ? renderSql((filter as { where: SQL }).where)
      : '',
  );

describe('listMyDrafts', () => {
  it("removes the default published gate and scopes to the author's drafts", async () => {
    captured = undefined;
    await listMyDrafts({ id: 'creator-1' } as never);
    expect(captured).toBeDefined();
    expect(captured!.defaultFilter).toBeUndefined();
    const sqls = filterSqls(captured!);
    // Drafts only: `published_at IS NULL`, and never the published IS NOT NULL gate.
    expect(
      sqls.some((s) => /is\s+null/i.test(s) && s.includes('published_at')),
    ).toBe(true);
    expect(
      sqls.some(
        (s) => /is\s+not\s+null/i.test(s) && s.includes('published_at'),
      ),
    ).toBe(false);
    // Creator-scoped to the requesting profile.
    const creator = sqls.find((s) => s.includes('creator_id'));
    expect(creator).toBeDefined();
    expect(creator).toContain('creator-1');
  });

  it('orders drafts newest-first (updated_at DESC)', async () => {
    captured = undefined;
    await listMyDrafts({ id: 'creator-1' } as never);
    expect(captured).toBeDefined();
    expect(JSON.stringify(captured!.sort)).toContain('updatedAt');
    expect(JSON.stringify(captured!.sort)).toMatch(/DESC/i);
  });
});
