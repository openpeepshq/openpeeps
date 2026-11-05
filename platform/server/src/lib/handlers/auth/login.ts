import type {
  AccountWithMeta,
  LoginRequest,
  TokenResponse,
} from '@openpeepshq/common/types';
import { authNeeded, internalError } from '#lib/errors';
import { checkPassword, findAccountByEmail } from '@openpeepshq/core/accounts';
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
  if (!account || !(await checkPassword(account, loginRequest.password))) {
    throw authNeeded('auth.login.invalidCredentials');
  }

  const profile = await retrieveProfile(account);
  if (!profile) {
    throw internalError();
  }

  const subscriptionNeeded = !(await checkSubscription(profile, account, true));

  const checkoutUrl = subscriptionNeeded
    ? await createStripeCheckoutUrl(profile, account)
    : undefined;

  const token = await createSignedProfileAccessToken({
    account,
    profile,
    name: 'login',
    expirationTime: '1w',
  }).then((accessToken) => accessToken.signedToken);

  if (!token) {
    throw internalError();
  }

  return { success: true, token, checkoutUrl };
};
