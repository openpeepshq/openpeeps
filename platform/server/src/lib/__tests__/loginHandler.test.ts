import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loginHandler } from '#lib/handlers/auth/login';
import { DUMMY_ACCOUNT } from '#lib/handlers/auth/dummyAccount';
import {
  checkPassword,
  findAccountByEmail,
  rehashPasswordIfBelowCost,
} from '@openpeepshq/core/accounts';
import { listProfilesByAccount } from '@openpeepshq/core/profiles';
import { communityConfig } from '@openpeepshq/core/config';
import { createSignedProfileAccessToken } from '@openpeepshq/core/accessTokens';
import type { AccountWithMeta } from '@openpeepshq/common/types';

// Unit-level test of the login handler's anti-enumeration and error paths
// (#1915 review round 2, suggestions 1 and 2): the handler must return one
// status/key for both an unknown account and a wrong password, must still run
// a bcrypt comparison on the unknown-account branch (timing equalization,
// suggestion 3), and must 500 — not 404 — when the account exists but has no
// profile. Deps are mocked; the handler itself runs unmocked.
vi.mock('@openpeepshq/core/accounts', () => ({
  checkPassword: vi.fn(),
  findAccountByEmail: vi.fn(),
  rehashPasswordIfBelowCost: vi.fn(),
}));
vi.mock('@openpeepshq/core/profiles', () => ({
  findProfile: vi.fn(),
  listProfilesByAccount: vi.fn(),
  assignRole: vi.fn(),
}));
vi.mock('@openpeepshq/core/stripe', () => ({
  createStripeCheckoutUrl: vi.fn(),
  checkSubscription: vi.fn(),
}));
vi.mock('@openpeepshq/core/config', () => ({
  communityConfig: vi.fn(),
}));
vi.mock('@openpeepshq/core/roles', () => ({
  findRoleByKey: vi.fn(),
}));
vi.mock('@openpeepshq/core/accessTokens', () => ({
  createSignedProfileAccessToken: vi.fn(),
}));

const account = {
  id: 'a1',
  createdAt: '2000-01-01T00:00:00.000Z',
  updatedAt: '2000-01-01T00:00:00.000Z',
  email: 'exists@openpeeps.test',
  passwordHash: '$2b$12$irrelevant-for-a-mocked-compare',
  profiles: [],
} as AccountWithMeta;

const login = (email: string, password: string) =>
  loginHandler({ email, password } as never);

const expectInvalidCredentials = async (email: string, password: string) => {
  const err = await login(email, password).catch((e) => e);
  expect(err).toMatchObject({ status: 401 });
  // Riddl serialises the httpError `message` into the wire body; the client
  // mapper reads it, so the i18n key must ride on `message` (the handler does
  // not set a separate `key` field). This is what the client test pins.
  expect((err as { message: string }).message).toBe(
    'auth.login.invalidCredentials',
  );
};

describe('loginHandler — anti-enumeration and error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findAccountByEmail).mockResolvedValue(account);
    vi.mocked(checkPassword).mockResolvedValue(false);
    vi.mocked(listProfilesByAccount).mockResolvedValue([]);
    // Default: the migration is an identity (already at target cost) so the
    // success path resolves; the dedicated test below pins the real call.
    vi.mocked(rehashPasswordIfBelowCost).mockImplementation(async (acc) => acc);
    vi.mocked(communityConfig).mockResolvedValue({
      roles: {
        onEmailValidation: { add: [] },
        onRegistration: { add: [] },
      },
    } as never);
  });

  it('throws 401 auth.login.invalidCredentials for an unknown account', async () => {
    vi.mocked(findAccountByEmail).mockResolvedValue(undefined);

    await expectInvalidCredentials('missing@openpeeps.test', 'pw');

    // The unknown-account branch must still run a bcrypt comparison — this is
    // the timing equalization: without it the short-circuit skips bcrypt and
    // the faster response leaks which emails exist. Pin that the comparison
    // routes through the dummy hash, not a skip.
    expect(checkPassword).toHaveBeenCalledTimes(1);
    expect(checkPassword).toHaveBeenCalledWith(DUMMY_ACCOUNT, 'pw');
  });

  it('throws the identical 401 for an existing account with a wrong password', async () => {
    // Same status, same key, same message as the unknown-account case — the
    // response does not reveal whether the account exists.
    await expectInvalidCredentials('exists@openpeeps.test', 'wrongpw');
    expect(checkPassword).toHaveBeenCalledWith(account, 'wrongpw');
    // The migration must not run on a failed login: only a confirmed password
    // gives the plaintext needed to rehash.
    expect(rehashPasswordIfBelowCost).not.toHaveBeenCalled();
  });

  it('throws 500 (not 404) when the account exists but has no profile', async () => {
    vi.mocked(checkPassword).mockResolvedValue(true);
    vi.mocked(listProfilesByAccount).mockResolvedValue([]);

    const err = await login('exists@openpeeps.test', 'rightpw').catch((e) => e);
    // A data-integrity anomaly, not a client error — pin that it is 500 and
    // explicitly not the old 404.
    expect((err as { status: number }).status).toBe(500);
  });

  it('migrates the password hash on a successful login', async () => {
    // The round-5 fix: a legacy account whose stored hash is below
    // PASSWORD_HASH_COST would otherwise make the real-account login branch
    // faster than the dummy compare, re-opening the email-enumeration oracle
    // for the existing user base. The handler must hand the (confirmed)
    // password to the core migration so the next login compares at the target
    // cost.
    vi.mocked(checkPassword).mockResolvedValue(true);
    const migrated = { ...account, passwordHash: '$2b$12$migrated' };
    vi.mocked(rehashPasswordIfBelowCost).mockResolvedValue(migrated);

    // The login succeeds (a profile exists; token deps are success-mocked):
    // the point is that the confirmed password reached the migration. A
    // non-empty role list keeps retrieveProfile off the findProfile path.
    vi.mocked(listProfilesByAccount).mockResolvedValue([
      { id: 'p1', roles: ['member'] } as never,
    ]);
    vi.mocked(createSignedProfileAccessToken).mockResolvedValue({
      signedToken: 'tok',
    } as never);
    const result = await login('exists@openpeeps.test', 'rightpw');
    expect(result.success).toBe(true);

    expect(rehashPasswordIfBelowCost).toHaveBeenCalledTimes(1);
    expect(rehashPasswordIfBelowCost).toHaveBeenCalledWith(account, 'rightpw');
  });
});
