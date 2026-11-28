import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compare, getRounds, hash } from 'bcrypt';
import { PASSWORD_HASH_COST } from '@openpeepshq/common/lib';
import type { AccountWithMeta } from '@openpeepshq/common/types';

// Unit test for the on-login password-hash migration (#1915 review round 5,
// suggestion 1): accounts created before the write paths adopted
// PASSWORD_HASH_COST carry a lower-cost bcrypt hash, which makes their login
// compare measurably faster than the cost-12 dummy the unknown-email branch
// compares against — re-opening the email-enumeration latency oracle for the
// existing user base. rehashPasswordIfBelowCost migrates such an account to
// the target cost on a successful login. bcrypt itself runs real (that is the
// behavior under test); the db / mapping / cache / log boundaries are mocked
// so the suite does not need Postgres.
vi.mock('../../db', () => ({
  allpeepDb: vi.fn(),
}));
vi.mock('../mapping', () => ({
  accountsMapping: { update: vi.fn() },
}));
vi.mock('../cache', () => ({
  accountsCache: { del: vi.fn() },
}));
vi.mock('../../log', () => ({
  logger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

import { allpeepDb } from '../../db';
import { accountsMapping } from '../mapping';
import { accountsCache } from '../cache';
import { rehashPasswordIfBelowCost } from '../rehash';

const account = (passwordHash: string): AccountWithMeta =>
  ({
    id: 'a1',
    createdAt: '2000-01-01T00:00:00.000Z',
    updatedAt: '2000-01-01T00:00:00.000Z',
    email: 'legacy@openpeeps.test',
    passwordHash,
    profiles: [],
  }) as AccountWithMeta;

const update = vi.mocked(
  (accountsMapping as { update: ReturnType<typeof vi.fn> }).update,
);

describe('rehashPasswordIfBelowCost — on-login bcrypt cost migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(allpeepDb).mockResolvedValue({ db: {} } as never);
    // Persist the freshly computed hash and return it as the updated account,
    // so the test can verify the hash that reached the write path.
    update.mockImplementation(async (_db, _id, patch) => {
      const writtenHash = (patch as { passwordHash: string }).passwordHash;
      return account(writtenHash);
    });
  });

  it('rehashes a legacy low-cost hash to PASSWORD_HASH_COST and persists it', async () => {
    // A real cost-4 hash (the cost pre-fix accounts carry: 1024 & 0xFF === 4).
    const legacyHash = await hash('legacy-pw', 4);
    expect(getRounds(legacyHash)).toBe(4);
    expect(PASSWORD_HASH_COST).toBeGreaterThan(4);

    const result = await rehashPasswordIfBelowCost(
      account(legacyHash),
      'legacy-pw',
    );

    // The stored hash is replaced at the target cost, and the replacement
    // still verifies against the original password.
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({}, 'a1', {
      passwordHash: expect.stringMatching(/^\$2[abxy]\$\d{2}\$/),
    });
    const writtenHash = (
      update.mock.calls[0][2] as {
        passwordHash: string;
      }
    ).passwordHash;
    expect(getRounds(writtenHash)).toBe(PASSWORD_HASH_COST);
    expect(await compare('legacy-pw', writtenHash)).toBe(true);

    // The account's cache entries are invalidated and the returned account
    // carries the migrated hash (login continues with it).
    expect(accountsCache.del).toHaveBeenCalledWith('a1');
    expect(accountsCache.del).toHaveBeenCalledWith('legacy@openpeeps.test');
    expect(result.passwordHash).toBe(writtenHash);
  });

  it('is a no-op for an account already at PASSWORD_HASH_COST', async () => {
    const currentHash = await hash('pw', PASSWORD_HASH_COST);
    const input = account(currentHash);

    const result = await rehashPasswordIfBelowCost(input, 'pw');

    // No second bcrypt hash, no db access, no persistence, no cache churn —
    // the steady-state login must not pay a migration cost.
    expect(update).not.toHaveBeenCalled();
    expect(allpeepDb).not.toHaveBeenCalled();
    expect(accountsCache.del).not.toHaveBeenCalled();
    expect(result).toBe(input);
  });

  it('is a no-op for an account whose cost is already above the target', async () => {
    const futureHash = await hash('pw', PASSWORD_HASH_COST + 2);
    const input = account(futureHash);

    const result = await rehashPasswordIfBelowCost(input, 'pw');

    expect(update).not.toHaveBeenCalled();
    expect(allpeepDb).not.toHaveBeenCalled();
    expect(result).toBe(input);
  });

  it('is a no-op for a hash whose cost cannot be read', async () => {
    const input = account('not-a-bcrypt-hash');

    const result = await rehashPasswordIfBelowCost(input, 'pw');

    expect(update).not.toHaveBeenCalled();
    expect(allpeepDb).not.toHaveBeenCalled();
    expect(result).toBe(input);
  });
});
