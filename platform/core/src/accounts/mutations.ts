import {
  Account,
  AccountCreationData,
  AccountUpdateData,
  AccountWithMeta,
  Profile,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { createSignedProfileAccessToken } from '../accessTokens/tokens';
import { jwtUtil } from '../jwt';
import { serverRootUrl } from '../server';
import { emailService } from '../email';
import { allpeepDb, collectionInfos } from '../db';
import { communityConfig, config } from '../config';
import { accountsMapping } from './mapping';
import { accountsCache } from './cache';
import { assignRole, unassignRole } from '../profiles/mutations';
import { hash } from 'bcrypt';
import { profilesMapping } from '../profiles/mapping';
import { assertProfileCapacity } from '../profiles/capacity';
import { findRoleByKey } from '../roles';
import {
  log,
  normalizeEmailAddress,
  sendEmailValidationMail,
  sendWelcomeEmail,
} from './helpers';
import { findAccountByEmail } from './finders';
import { inviteLinksMapping } from '../inviteLinks/mapping';
import { redeemInviteLink } from '../inviteLinks/mutations';
import { conflict } from '../errors';
import { connector } from '../db/helpers';
import { hub } from '../events';
import {
  deletePushSubscription,
  listPushSubscriptionsByAccount,
} from '../pushSubscriptions';

const applyCommunityRoleChanges = async (
  profile: Profile,
  changes: { add: string[]; remove: string[] },
) => {
  for (const roleKey of changes.add) {
    const role = await findRoleByKey(roleKey);
    if (role) {
      await assignRole(profile, role);
    } else {
      log.error(`Role ${roleKey} missing`);
    }
  }
  for (const roleKey of changes.remove) {
    const role = await findRoleByKey(roleKey);
    if (role) {
      await unassignRole(profile, role);
    } else {
      log.error(`Role ${roleKey} missing`);
    }
  }
};

export const createAccount = async (
  accountCreationData: AccountCreationData,
) => {
  const { db } = await allpeepDb();
  const coreConfig = await config();
  const communityConf = await communityConfig();

  const {
    email,
    password,
    emailValidated = false,
    inviteCode,
  } = accountCreationData;

  const normalizedEmail = normalizeEmailAddress(email)!; // We know that email is not undefined because of the schema

  const firstAccount = (await accountsMapping.count(db)) === 0;

  if (await findAccountByEmail(normalizedEmail)) {
    throw conflict({
      errorKey: 'emailAlreadyTaken',
      parameters: { email: normalizedEmail },
    });
  }

  if (
    accountCreationData.profile &&
    (await profilesMapping.findOneBy(db, {
      matches: {
        handle: accountCreationData.profile.handle,
        activityPub: { domain: coreConfig.activityPub.defaultDomain },
      },
    }))
  ) {
    throw conflict({
      errorKey: 'handleAlreadyTaken',
      parameters: {
        handle: accountCreationData.profile.handle,
        domain: coreConfig.activityPub.defaultDomain,
      },
    });
  }

  const account = await accountsMapping.create(db, {
    email: normalizedEmail,
    passwordHash: await hash(password, 1024),
    emailValidated,
  });
  await accountsCache.del(normalizedEmail);
  await accountsCache.del(account.id);

  let profile: ProfileWithMeta | undefined;
  if (accountCreationData.profile) {
    await assertProfileCapacity();
    const { handle, displayName, avatar, bot } = accountCreationData.profile;

    profile = await profilesMapping.create(db, {
      handle,
      displayName,
      avatar,
      ...(bot === true ? { bot: true } : {}),
      activityPub: {
        domain: coreConfig.activityPub.defaultDomain,
      },
      type: 'local',
    });

    if (firstAccount && profile) {
      const ownerRole = await findRoleByKey('owner');
      if (ownerRole) {
        await assignRole(profile, ownerRole);
      } else {
        log.error('Owner role missing');
      }
    } else {
      await hub.emit('profileCreated', profile);
      await applyCommunityRoleChanges(
        profile,
        communityConf.roles.onRegistration,
      );
      // Authorized/SSO creates skip the validation email, so apply the
      // same promotion humans get after confirming.
      if (emailValidated) {
        await applyCommunityRoleChanges(
          profile,
          communityConf.roles.onEmailValidation,
        );
      }
    }

    if (inviteCode) {
      // validate invite code
      const inviteLink = await inviteLinksMapping.findOneBy(db, {
        matches: { slug: inviteCode },
      });

      if (inviteLink) {
        await redeemInviteLink(inviteLink, profile);
      } else {
        log.error(`Invalid invite code ${inviteCode}`);
      }
    }

    await giveControl(db, account, profile);
    await accountsCache.del(account.id);
    await accountsCache.del(account.email);
  }

  await sendWelcomeEmail(account);

  if (account && !emailValidated) {
    await sendEmailValidationMail(account);
  }

  return { account, profile };
};

export const updateAccount = async (accountData: AccountUpdateData) => {
  const { db } = await allpeepDb();

  if (!accountData?.account?.id) {
    throw new Error('Account ID is missing');
  }

  const previousEmail = accountData.account.email;
  const updatedEmail = normalizeEmailAddress(accountData.email);

  const account = await accountsMapping.update(
    db,
    accountData.account.id as string,
    {
      email: updatedEmail,
      passwordHash: accountData.password
        ? await hash(accountData.password, 12)
        : undefined,
      emailValidated: accountData.emailValidated,
    },
  );
  await accountsCache.del(accountData.account.id);
  await accountsCache.del(previousEmail);
  if (updatedEmail) {
    await accountsCache.del(updatedEmail);
  }

  if (account && accountData.emailValidated === false) {
    await sendEmailValidationMail(account);
  }

  return { account };
};

export const deleteAccount = async (account: Account) => {
  const { db } = await allpeepDb();
  await accountsMapping.delete(db, account.id);
  await accountsCache.del(account.id);
  await accountsCache.del(account.email);
  const subscriptions = await listPushSubscriptionsByAccount(account);
  await Promise.all(
    subscriptions.map(async (sub) => await deletePushSubscription(sub.id)),
  );
};

export const sendResetPasswordEmail = async (account: AccountWithMeta) => {
  const token = await createSignedProfileAccessToken({
    account,
    name: 'reset-password',
    scopes: [
      { scopeLevel: 'admin', resource: { type: 'profiles', id: account.id } },
    ],
    expirationTime: '1d',
  });

  const resetPasswordLink = `${await serverRootUrl()}/auth/reset-password#token=${token.signedToken}`;

  await emailService().then((mailer) =>
    mailer.send({
      to: account.email,
      locals: {
        resetPasswordLink,
      },
      template: 'resetPassword',
    }),
  );
};

export const validateEmail = async (token: string) => {
  const communityConf = await communityConfig();
  const jwt = await jwtUtil();
  const { db } = await allpeepDb();
  try {
    const validatedToken = await jwt.verify(token);
    const email = validatedToken?.payload?.email as string;
    const account = await findAccountByEmail(email ?? '');
    if (account) {
      await accountsMapping.update(db, account.id, { emailValidated: true });
      await accountsCache.del(account.id);
      await accountsCache.del(account.email);

      await applyCommunityRoleChanges(
        account.profiles[0],
        communityConf.roles.onEmailValidation,
      );
      return true;
    }
  } catch (e) {
    log.error(e, 'Error confirming email.');
    return false;
  }
};
export const giveControl = connector(
  collectionInfos.accountsCollection,
  collectionInfos.profilesCollection,
  collectionInfos.controlsCollection,
);
