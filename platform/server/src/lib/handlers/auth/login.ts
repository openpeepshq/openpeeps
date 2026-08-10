import type {
  AccountWithMeta,
  LoginRequest,
  TokenResponse,
} from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import { checkPassword, findAccountByEmail } from '@openpeepshq/core/accounts';
import { findProfile, listProfilesByAccount, assignRole } from '@openpeepshq/core/profiles';
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

  if (!account) {
    throw notFound(`Account with email ${lowerCaseRequestEmail}`);
  }

  const profile = await retrieveProfile(account);
  if (!profile) {
    throw notFound(
      `Profile associated with account with email ${account.email}`,
    );
  }

  if (!(await checkPassword(account, loginRequest.password))) {
    throw forbidden(
      `This email/password combination doesn't match a valid account.`,
    );
  }

  const subscriptionNeeded = !(await checkSubscription(profile, account, true));

  const checkoutUrl = subscriptionNeeded ? await createStripeCheckoutUrl(profile, account) : undefined;

  const token = await createSignedProfileAccessToken({
    account,
    profile,
    name: 'login',
    expirationTime: '1w',
  }).then((accessToken) => accessToken.signedToken);

  if (!token) {
    throw forbidden('login.access-token-creation-failed');
  }

  return { success: true, token, checkoutUrl };
};
