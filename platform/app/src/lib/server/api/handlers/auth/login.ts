import type {
  AccountWithMeta,
  LoginRequest,
  TokenResponse,
} from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden, notFound } from '$lib/server/api/errors';
import { checkPassword, findAccountByEmail } from '@openpeeps/core/accounts';
import { findProfile, listProfilesByAccount, assignRole } from '@openpeeps/core/profiles';
import {
  createStripeCheckoutUrl,
  checkSubscription,
} from '@openpeeps/core/stripe';
import { communityConfig } from '@openpeeps/core/config';
import { findRoleByKey } from '@openpeeps/core/roles';
import { createSignedProfileAccessToken } from '@openpeeps/core/accessTokens';
import { UAParser } from 'ua-parser-js';

const guessClientDescription = (event: RequestEvent): string => {
  const userAgent = event.request.headers.get('user-agent') ?? '';
  if (!userAgent) {
    return 'Unknown client';
  }

  const parsed = new UAParser(userAgent).getResult();
  const browser = parsed.browser.name ?? 'Unknown browser';
  const os = parsed.os.name ?? 'Unknown OS';

  return `${browser} on ${os}`;
};

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
  event: RequestEvent,
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
    description: guessClientDescription(event),
    expirationTime: '1w',
  })
    .then((accessToken) => accessToken.signedToken);

  if (!token) {
    throw forbidden('login.access-token-creation-failed');
  }

  return { success: true, token, checkoutUrl };
};
