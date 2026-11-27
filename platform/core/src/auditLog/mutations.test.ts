import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  inserted: [] as Record<string, unknown>[],
  select: vi.fn(),
  insertError: null as unknown,
  logError: vi.fn(),
}));

vi.mock('../db', () => ({
  allpeepDb: vi.fn(async () => {
    const insertChain = {
      values: (values: Record<string, unknown>) => ({
        returning: () => {
          if (testState.insertError) {
            return Promise.reject(testState.insertError);
          }
          testState.inserted.push(values);
          return Promise.resolve([values]);
        },
      }),
    };
    return {
      db: {
        insert: () => insertChain,
        select: () => ({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: (limit: number) =>
                  Promise.resolve(testState.select(limit)),
              }),
            }),
          }),
        }),
      },
    };
  }),
}));

vi.mock('../log', () => ({
  logger: () => ({
    // Delegate through a getter so `beforeEach`'s swap is observed.
    get error() {
      return testState.logError;
    },
    warn: vi.fn(),
  }),
}));

const { createAuditEntry, recordAuditEntry } = await import('./mutations');
const { listAuditEntries } = await import('./finders');
const { mapAuditLogRow } = await import('./mapping');
const { auditLogEntrySchema } = await import('@openpeepshq/common/types');

const profile = {
  id: 'profile-1',
  controllers: [{ id: 'account-1' }],
} as const;

describe('auditLog', () => {
  beforeEach(() => {
    testState.inserted = [];
    testState.insertError = null;
    testState.select = vi.fn().mockResolvedValue([]);
    testState.logError = vi.fn();
  });

  it('createAuditEntry inserts one row with null-coerced optional fields', async () => {
    await createAuditEntry({
      actorProfileId: 'profile-1',
      action: 'profile.delete',
      targetType: 'profile',
      targetId: 'profile-2',
    });
    expect(testState.inserted).toHaveLength(1);
    expect(testState.inserted[0]).toMatchObject({
      actorProfileId: 'profile-1',
      actorAccountId: null,
      actorIp: null,
      action: 'profile.delete',
      targetType: 'profile',
      targetId: 'profile-2',
      targetLabel: null,
      metadata: null,
    });
  });

  it('recordAuditEntry resolves actor profile and owning account from ctx', async () => {
    await recordAuditEntry(
      {
        action: 'role.update',
        targetType: 'role',
        targetId: 'role-1',
        targetLabel: 'admin',
        metadata: { add: ['core-roles-update'] },
      },
      { profile: profile as never, ip: '203.0.113.9' },
    );
    expect(testState.inserted).toHaveLength(1);
    expect(testState.inserted[0]).toMatchObject({
      actorProfileId: 'profile-1',
      actorAccountId: 'account-1',
      actorIp: '203.0.113.9',
    });
  });

  it('recordAuditEntry swallows insert failures (fire-and-forget)', async () => {
    const boom = new Error('db down');
    testState.insertError = boom;
    await expect(
      recordAuditEntry(
        { action: 'report.resolve', targetType: 'report', targetId: 'r-1' },
        { profile: profile as never },
      ),
    ).resolves.toBeUndefined();
    expect(testState.inserted).toHaveLength(0);
    expect(testState.logError).toHaveBeenCalledTimes(1);
  });

  it('listAuditEntries caps the limit at 1000 and defaults to 100', async () => {
    await listAuditEntries();
    expect(testState.select).toHaveBeenCalledWith(100);
    await listAuditEntries({ limit: 99999 });
    expect(testState.select).toHaveBeenLastCalledWith(1000);
    await listAuditEntries({ limit: 25 });
    expect(testState.select).toHaveBeenLastCalledWith(25);
  });

  it('mapAuditLogRow passes the row fields through unchanged', () => {
    const row = {
      id: 'id-1',
      actorProfileId: 'p1',
      actorAccountId: null,
      actorIp: null,
      action: 'account.update',
      targetType: 'account',
      targetId: 'a1',
      targetLabel: 'a@b.c',
      metadata: null,
      createdAt: '2026-11-26 12:00:00.000+00',
    } as never;
    expect(mapAuditLogRow(row)).toMatchObject({
      id: 'id-1',
      actorProfileId: 'p1',
      action: 'account.update',
      targetLabel: 'a@b.c',
      // The pg driver returns timestamptz as an offset string; the mapper
      // normalizes it to ISO 8601 UTC.
      createdAt: '2026-11-26T12:00:00.000Z',
    });
  });

  it('mapAuditLogRow output validates against auditLogEntrySchema (no 500)', () => {
    // Regression: Riddl validates the handler output with the zod schema at
    // runtime. A raw pg timestamptz string (`... 12:00:00+00`) is rejected by
    // `z.string().datetime()`; only the ISO-normalized form is accepted.
    const row = {
      id: 'id-2',
      actorProfileId: 'p2',
      actorAccountId: 'acct-2',
      actorIp: '203.0.113.7',
      action: 'role.update',
      targetType: 'role',
      targetId: 'role-2',
      targetLabel: 'admin',
      metadata: { add: ['core-auditLog-read'] },
      createdAt: '2026-11-26 14:30:15.123+02',
    } as never;
    const mapped = mapAuditLogRow(row);
    expect(mapped.createdAt).toBe('2026-11-26T12:30:15.123Z');
    expect(auditLogEntrySchema.safeParse(mapped).success).toBe(true);
  });
});
