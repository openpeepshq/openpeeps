import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core/dialect';

const testState = vi.hoisted(() => ({
  whereArg: undefined as unknown,
  select: vi.fn(),
}));

vi.mock('../db', () => ({
  allpeepDb: vi.fn(async () => ({
    db: {
      select: () => ({
        from: () => ({
          where: (cond: unknown) => {
            testState.whereArg = cond;
            return {
              orderBy: () => ({
                limit: (limit: number) =>
                  Promise.resolve(testState.select(limit)),
              }),
            };
          },
        }),
      }),
    },
  })),
}));

const { listAuditEntries } = await import('./finders');

const dialect = new PgDialect({});
const renderWhere = (): string =>
  testState.whereArg ? dialect.sqlToQuery(testState.whereArg).sql : '';

beforeEach(() => {
  testState.whereArg = undefined;
  testState.select = vi.fn().mockResolvedValue([]);
});

// Regression: a `created_at`-only cursor silently dropped rows that tied on
// the boundary timestamp with the page's last row. The cursor must be the
// composite `(created_at, id)` pair so ties are paginated, not skipped.
describe('listAuditEntries cursor', () => {
  it('builds the composite (created_at, id) cursor when both are given', async () => {
    await listAuditEntries({
      before: '2026-11-26T12:00:00.000Z',
      beforeId: '00000000-0000-0000-0000-000000000001',
      limit: 5,
    });

    const sql = renderWhere();
    // strictly-older OR (same timestamp AND smaller id)
    expect(sql).toContain('"audit_logs"."created_at" < $');
    expect(sql).toContain('"audit_logs"."created_at" = $');
    expect(sql).toContain('"audit_logs"."id" < $');
  });

  it('falls back to a created_at-only cursor when beforeId is absent', async () => {
    await listAuditEntries({
      before: '2026-11-26T12:00:00.000Z',
      limit: 5,
    });

    const sql = renderWhere();
    expect(sql).toContain('"audit_logs"."created_at" < $');
    expect(sql).not.toContain('"audit_logs"."id"');
  });

  it('applies no time cursor when neither before nor beforeId is given', async () => {
    await listAuditEntries({ limit: 5 });
    expect(testState.whereArg).toBeUndefined();
  });
});
