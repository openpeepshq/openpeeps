/**
 * bcrypt cost for account password hashing. The core write paths
 * (`createAccount` / `updateAccount` in `platform/core`) and the server's
 * login dummy hash
 * (`platform/server/src/lib/handlers/auth/dummyAccount.ts`) must all use this
 * value: the unknown-email login branch compares against the dummy to
 * equalize timing with the real-account branch, so a cost mismatch inverts
 * the anti-enumeration fix into a latency oracle.
 */
export const PASSWORD_HASH_COST = 12;
