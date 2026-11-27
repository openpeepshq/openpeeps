import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureRoleCapabilities } from '#lib/auth';
import { listAuditEntries } from '@openpeepshq/core/auditLog';
import { findProfileByHandle } from '@openpeepshq/core/profiles';
import { apiEndpoint as listApiEndpoint } from '../../api/openpeeps/core/v1/admin/audit-log/GET';
import { apiEndpoint as exportApiEndpoint } from '../../api/openpeeps/core/v1/admin/audit-log/export/GET';

// DB row type, derived from the finder signature to avoid a 2-segment
// `@openpeepshq/core/db/pg/schema` import (lint-restricted to one subpath).
type AuditLogRow = Awaited<ReturnType<typeof listAuditEntries>>[number];

// Unit-level tests for the audit-log admin endpoints. The handler's only
// external dependencies are the DB-backed audit log (via
// `@openpeepshq/core/auditLog`) and capability auth (`#lib/auth`), so those
// are mocked while the handler's own paging/branch logic runs unmocked.
//
// Note: calling `apiEndpoint.handle(...)` directly bypasses Riddl's router,
// so the Query schema's coercion (e.g. `limit`) is NOT applied — Riddl
// parses/coerces query params when a real HTTP request is routed. The tests
// therefore pass already-coerced values (a number for `limit`) so the
// assertions reflect what the handler receives in production.
vi.mock('#lib/auth', () => ({
  ensureRoleCapabilities: vi.fn(async () => undefined),
}));

vi.mock('@openpeepshq/core/auditLog', () => ({
  listAuditEntries: vi.fn(),
  mapAuditLogRows: (rows: AuditLogRow[]) => rows,
}));

// `resolveActorFilter` resolves a non-UUID `actor` filter by handle.
vi.mock('@openpeepshq/core/profiles', () => ({
  findProfileByHandle: vi.fn(),
}));

const row = (i: number, overrides: Partial<AuditLogRow> = {}): AuditLogRow =>
  ({
    id: `id-${i}`,
    actorProfileId: 'actor-1',
    actorAccountId: 'account-1',
    actorIp: '203.0.113.9',
    action: 'profile.delete',
    targetType: 'profile',
    targetId: 'target-1',
    targetLabel: 'target',
    metadata: null,
    createdAt: `2026-11-26T12:00:${String(60 - i).padStart(2, '0')}.000Z`,
    ...overrides,
  }) as unknown as AuditLogRow;

const call = (
  endpoint: typeof listApiEndpoint,
  query: Record<string, unknown>,
) => endpoint.handle({ body: {}, query, param: {}, event: {} });

beforeEach(() => {
  vi.mocked(listAuditEntries).mockReset();
  vi.mocked(ensureRoleCapabilities).mockReset();
  vi.mocked(ensureRoleCapabilities).mockResolvedValue(undefined as never);
  vi.mocked(findProfileByHandle).mockReset();
  vi.mocked(findProfileByHandle).mockResolvedValue(undefined);
});

describe('admin audit-log list', () => {
  it('returns mapped entries and requires core-auditLog-read', async () => {
    const rows = [row(1), row(2)];
    vi.mocked(listAuditEntries).mockResolvedValue(rows);

    const res = (await call(listApiEndpoint, {})) as {
      entries: unknown[];
    };

    expect(res.entries).toEqual(rows);
    expect(listAuditEntries).toHaveBeenCalledWith({
      before: undefined,
      beforeId: undefined,
      limit: undefined,
      actorProfileId: undefined,
      targetType: undefined,
      targetId: undefined,
    });
    expect(ensureRoleCapabilities).toHaveBeenCalledWith({}, [
      'core-auditLog-read',
    ]);
  });

  it('passes filters through (profile-ID actor → actorProfileId, coerced limit)', async () => {
    vi.mocked(listAuditEntries).mockResolvedValue([]);

    await call(listApiEndpoint, {
      actor: '00000000-0000-1000-8000-000000000007',
      targetType: 'role',
      targetId: 'role-1',
      limit: 25,
      before: '2026-11-26T00:00:00.000Z',
      beforeId: '00000000-0000-0000-0000-0000000000ff',
    });

    expect(listAuditEntries).toHaveBeenCalledWith({
      before: '2026-11-26T00:00:00.000Z',
      beforeId: '00000000-0000-0000-0000-0000000000ff',
      limit: 25,
      actorProfileId: '00000000-0000-1000-8000-000000000007',
      targetType: 'role',
      targetId: 'role-1',
    });
  });

  it('resolves a handle actor filter to the profile ID', async () => {
    vi.mocked(listAuditEntries).mockResolvedValue([]);
    vi.mocked(findProfileByHandle).mockResolvedValue({
      id: '00000000-0000-1000-8000-000000000007',
    } as never);

    const res = (await call(listApiEndpoint, { actor: 'jane' })) as {
      entries: unknown[];
    };

    expect(listAuditEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        actorProfileId: '00000000-0000-1000-8000-000000000007',
      }),
    );
    expect(res.entries).toEqual([]);
  });

  it('matches nothing when a handle actor filter resolves to no profile', async () => {
    vi.mocked(findProfileByHandle).mockResolvedValue(undefined);

    const res = (await call(listApiEndpoint, {
      actor: 'ghost',
      limit: 25,
    })) as { entries: unknown[] };

    expect(res.entries).toEqual([]);
    // The match-nothing sentinel must short-circuit before touching the log.
    expect(listAuditEntries).not.toHaveBeenCalled();
  });

  it('propagates a capability failure', async () => {
    vi.mocked(ensureRoleCapabilities).mockRejectedValueOnce(
      new Error('forbidden'),
    );
    await expect(call(listApiEndpoint, {})).rejects.toThrow('forbidden');
  });
});

describe('admin audit-log export', () => {
  it('pages newest-first until a short page and bundles JSON', async () => {
    const pageOne = Array.from({ length: 1000 }, (_, i) => row(i + 1));
    const pageTwo = Array.from({ length: 3 }, (_, i) => row(1001 + i));
    vi.mocked(listAuditEntries)
      .mockResolvedValueOnce(pageOne)
      .mockResolvedValueOnce(pageTwo);

    const res = (await call(exportApiEndpoint, {})) as {
      filename: string;
      contentType: string;
      encoding: 'utf8';
      content: string;
    };

    // Second page is fetched with the last row of the first page as cursor.
    expect(listAuditEntries).toHaveBeenCalledTimes(2);
    expect(vi.mocked(listAuditEntries).mock.calls[1][0]?.before).toBe(
      pageOne[pageOne.length - 1].createdAt,
    );
    expect(vi.mocked(listAuditEntries).mock.calls[1][0]?.beforeId).toBe(
      pageOne[pageOne.length - 1].id,
    );

    expect(res.contentType).toBe('application/json');
    expect(res.encoding).toBe('utf8');
    expect(res.filename).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.json$/);

    const parsed = JSON.parse(res.content) as {
      exportedAt: string;
      entries: { id: string }[];
    };
    expect(parsed.exportedAt).toBeTruthy();
    // Newest-first order preserved across pages.
    expect(parsed.entries.map((e) => e.id)).toEqual(
      [...pageOne, ...pageTwo].map((r) => r.id),
    );
  });

  it('applies the same filters as the list endpoint', async () => {
    vi.mocked(listAuditEntries).mockResolvedValueOnce([]);

    await call(exportApiEndpoint, {
      actor: '00000000-0000-1000-8000-000000000007',
      targetType: 'role',
    });

    expect(vi.mocked(listAuditEntries).mock.calls[0][0]).toMatchObject({
      actorProfileId: '00000000-0000-1000-8000-000000000007',
      targetType: 'role',
      limit: 1000,
    });
  });

  it('exports an empty bundle when a handle actor filter resolves to no profile', async () => {
    vi.mocked(findProfileByHandle).mockResolvedValue(undefined);

    const res = (await call(exportApiEndpoint, { actor: 'ghost' })) as {
      contentType: string;
      encoding: 'utf8';
      content: string;
    };

    // The whole log must NOT be exported: an unresolvable actor matches
    // nothing, so the export is empty.
    expect(listAuditEntries).not.toHaveBeenCalled();
    expect(res.contentType).toBe('application/json');
    const parsed = JSON.parse(res.content) as { entries: unknown[] };
    expect(parsed.entries).toEqual([]);
  });

  it('carries the composite (createdAt, id) cursor past a timestamp tie', async () => {
    const TIE = '2026-11-26T12:00:00.000Z';
    // Newest-first: page one (a full page) ends mid-tie — its last row shares
    // `createdAt` with rows that must appear on page two.
    const pageOne: AuditLogRow[] = Array.from({ length: 1000 }, (_, i) =>
      row(i + 1),
    );
    pageOne[pageOne.length - 1] = row(1000, {
      createdAt: TIE,
      id: '00000000-0000-0000-0000-0000000000bb',
    });
    const pageTwo = [
      row(1001, { createdAt: TIE, id: '00000000-0000-0000-0000-0000000000cc' }),
      row(1002, { createdAt: '2026-11-26T11:59:00.000Z' }),
    ];
    vi.mocked(listAuditEntries)
      .mockResolvedValueOnce(pageOne)
      .mockResolvedValueOnce(pageTwo);

    const res = (await call(exportApiEndpoint, {})) as {
      content: string;
    };

    // The second page must be fetched with both the timestamp and the id of
    // the boundary row — a `createdAt`-only cursor would drop the tied rows.
    expect(vi.mocked(listAuditEntries).mock.calls[1][0]).toMatchObject({
      before: TIE,
      beforeId: '00000000-0000-0000-0000-0000000000bb',
    });

    const parsed = JSON.parse(res.content) as { entries: { id: string }[] };
    // No entry is skipped at the tie boundary.
    expect(parsed.entries.map((e) => e.id)).toEqual(
      [...pageOne, ...pageTwo].map((r) => r.id),
    );
  });
});
