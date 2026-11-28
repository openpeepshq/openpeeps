import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DUMMY_ACCOUNT } from '#lib/handlers/auth/dummyAccount';
import { PASSWORD_HASH_COST } from '@openpeepshq/common/lib';

// The login handler's unknown-email branch compares the submitted password
// against DUMMY_ACCOUNT to equalize timing with the real-account branch
// (anti-enumeration). The equalization only holds if that comparison costs
// the same as a real account's — i.e. the dummy's bcrypt cost must match
// whatever cost core's write paths hash with (`PASSWORD_HASH_COST`, used by
// `createAccount` / `updateAccount`). A mismatch inverts the fix into a
// latency oracle: an unknown-email login becomes measurably faster or
// slower than probing a real account (review round 4, suggestion 2).
//
// The cost is read from the bcrypt hash prefix ($2b$CC$) rather than through
// bcrypt: bcrypt is a core dependency, not a server one, and this pin must
// not add a server dependency to assert a constant.

const bcryptCost = (hash: string): number => {
  const match = hash.match(/^\$2[abxy]\$(\d{2})\$/);
  if (!match) throw new Error(`not a bcrypt hash: ${hash}`);
  return Number(match[1]);
};

const coreMutationsSource = () =>
  readFileSync(
    new URL('../../../../core/src/accounts/mutations.ts', import.meta.url),
    'utf8',
  );

describe('DUMMY_ACCOUNT cost parity', () => {
  it('uses the same bcrypt cost as the account write path', () => {
    expect(bcryptCost(DUMMY_ACCOUNT.passwordHash)).toBe(PASSWORD_HASH_COST);
  });

  it('keeps both write paths hashing through the shared constant', () => {
    // A literal at either call site (the original bug: `hash(password, 1024)`,
    // where 1024 truncates to cost 4) would silently desync the write path
    // from the dummy even though the constant still looks right.
    const throughConstant =
      coreMutationsSource().match(
        /hash\((?:password|accountData\.password), PASSWORD_HASH_COST\)/g,
      ) ?? [];
    expect(throughConstant).toHaveLength(2);
  });
});
