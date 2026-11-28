import type { AccountWithMeta } from '@openpeepshq/common/types';

/**
 * A throwaway account whose only job is to absorb a bcrypt comparison on the
 * unknown-email login path so both branches of `loginHandler` take the same
 * time (see `login.ts`). It is never persisted or validated: `checkPassword`
 * runs the hash, it fails, and the account is dropped.
 *
 * The hash is a real cost-12 bcrypt string, matching `PASSWORD_HASH_COST`
 * (`@openpeepshq/common/lib`) — the cost every register/update path hashes
 * with — so the comparison costs the same as a real account's. If that cost
 * ever changes, this hash must change with it (a cost mismatch inverts the
 * timing equalization into a latency oracle). Its value is irrelevant — it
 * must simply not match any password — so it is a fixed constant, not
 * generated per request (generating one per request would cost a bcrypt
 * *hash*, more than the comparison we are equalizing).
 */
export const DUMMY_ACCOUNT: AccountWithMeta = {
  id: '00000000-0000-0000-0000-000000000000',
  createdAt: '2000-01-01T00:00:00.000Z',
  updatedAt: '2000-01-01T00:00:00.000Z',
  email: 'dummy@openpeeps.invalid',
  passwordHash: '$2b$12$bi/kLbTHHZfo1/8tv.XZTOPRXStvYpvXLjcueRJavanEbhQpqoiui',
  profiles: [],
};
