import type {
  AccountWithMeta,
  LoginRequest,
  TokenResponse,
} from '@openpeepshq/common/types';
import { authNeeded, internalError } from '#lib/errors';
import {
  checkPassword,
  findAccountByEmail,
  rehashPasswordIfBelowCost,
} from '@openpeepshq/core/accounts';
import { DUMMY_ACCOUNT } from '#lib/handlers/auth/dummyAccount';
import {
  findProfile,
  listProfilesByAccount,
  assignRole,
} from '@openpeepshq/core/profiles';
import {
  createStripeCheckoutUrl,
  checkSubscription,
} from '@openpeepshq/core/stripe';
import { communityConfig } from '@openpeepshq/core/config';
import { findRoleByKey } from '@openpeepshq/core/roles';
import { createSignedProfileAccessToken } from '@openpeepshq/core/accessTokens';

const retrieveProfile = async (account: AccountWithMeta) => {
  const communityConf = await communityConfig();
  const profile = (await listProfilesByAccount(account))[0];
  if (profile && profile.roles.length === 0) {
    const defaultRoles = account.emailValidated
      ? communityConf.roles.onEmailValidation.add
      : communityConf.roles.onRegistration.add;
    for (const roleKey of defaultRoles) {
      const role = await findRoleByKey(roleKey);
      if (role) {
        await assignRole(profile, role);
      }
    }
    return findProfile(profile.id);
  }
  return profile;
};

export const loginHandler = async (
  loginRequest: LoginRequest,
): Promise<TokenResponse> => {
  const lowerCaseRequestEmail = loginRequest.email.toLowerCase();
  const account = await findAccountByEmail(lowerCaseRequestEmail);

  // One status and one key for both cases so the response does not reveal
  // whether the account exists.
  //
  // The unknown-email path also runs an equivalent bcrypt comparison against
  // a dummy hash so both branches take the same time for accounts at the
  // current cost. Without it the short-circuit would skip bcrypt entirely for
  // a non-existent account, and the faster response would leak which emails
  // exist even though the status and copy no longer do.
  if (!account) {
    await checkPassword(DUMMY_ACCOUNT, loginRequest.password);
    throw authNeeded('auth.login.invalidCredentials');
  }
  if (!(await checkPassword(account, loginRequest.password))) {
    throw authNeeded('auth.login.invalidCredentials');
  }

  // The timing equalization only holds once the account's stored hash is at
  // PASSWORD_HASH_COST: a legacy lower-cost hash would make this branch
  // measurably faster than the dummy compare, re-opening the oracle for
  // pre-existing accounts. Migrate it on the first successful login.
  const migrated = await rehashPasswordIfBelowCost(
    account,
    loginRequest.password,
  );

  const profile = await retrieveProfile(migrated);
  if (!profile) {
    throw internalError();
  }

  const subscriptionNeeded = !(await checkSubscription(
    profile,
    migrated,
    true,
  ));

  const checkoutUrl = subscriptionNeeded
    ? await createStripeCheckoutUrl(profile, migrated)
    : undefined;

  const token = await createSignedProfileAccessToken({
    account: migrated,
    profile,
    name: 'login',
    expirationTime: '1w',
  }).then((accessToken) => accessToken.signedToken);

  if (!token) {
    throw internalError();
  }

  return { success: true, token, checkoutUrl };
};
