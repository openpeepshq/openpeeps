import { AccountWithMeta } from '@openpeepshq/common/types';
import { PASSWORD_HASH_COST } from '@openpeepshq/common/lib';
import { getRounds, hash } from 'bcrypt';
import { allpeepDb } from '../db';
import { logger } from '../log';
import { accountsMapping } from './mapping';
import { accountsCache } from './cache';

const log = logger('core:accounts');

/**
 * Migrate a pre-existing account's password hash up to `PASSWORD_HASH_COST`
 * on a successful login (the standard bcrypt on-login rehash).
 *
 * Accounts created before the write paths adopted `PASSWORD_HASH_COST`
 * (see `mutations.ts`) still carry the old, lower-cost hash. Those low-cost
 * hashes make `checkPassword` measurably faster than the cost-12 dummy the
 * unknown-email login branch compares against, which re-opens the
 * email-enumeration latency oracle that PR #1915 closes. Rehashing (and
 * persisting) the hash on the next successful login moves the account to the
 * target cost, so the login timing equalization holds for the whole user base,
 * not just accounts created after the change.
 *
 * No-op in the steady state: if the stored hash is already at the target cost
 * (or higher), or its cost cannot be read, the function returns the account
 * unchanged — no hash, no write, no cache churn. Only a confirmed mismatch
 * triggers a rehash.
 */
export const rehashPasswordIfBelowCost = async (
  account: AccountWithMeta,
  password: string,
): Promise<AccountWithMeta> => {
  let storedCost: number;
  try {
    storedCost = getRounds(account.passwordHash);
  } catch {
    // Not a recognizable bcrypt hash — leave the stored value as-is.
    return account;
  }
  if (storedCost >= PASSWORD_HASH_COST) {
    return account;
  }

  const rehashed = await hash(password, PASSWORD_HASH_COST);
  const { db } = await allpeepDb();
  const updated = await accountsMapping.update(db, account.id, {
    passwordHash: rehashed,
  });
  await accountsCache.del(account.id);
  await accountsCache.del(account.email);
  log.info(
    `Migrated account ${account.id} password hash from cost ${storedCost} to ${PASSWORD_HASH_COST}.`,
  );
  return updated;
};
