import {
  Account,
  AccountCreationData,
  AccountUpdateData,
  ProfileWithMeta,
} from '@openpeeps/common/types';
import { createAuthorization } from '../auth/tokens';
import { jwtUtil } from '../jwt';
import { serverRootUrl } from '../server';
import { emailService } from '../email';
import { allpeepDb, collectionInfos } from '../db';
import { communityConfig, config } from '../config';
import { accountsMapping } from './mapping';
import { assignRole, unassignRole } from '../profiles/mutations';
import { hash } from 'bcrypt';
import { profilesMapping } from '../profiles/mapping';
import { findRoleByKey } from '../roles';
import { log, normalizeEmailAddress, sendEmailValidationMail, sendWelcomeEmail } from './helpers';
import { findAccountByEmail } from './finders';
import { inviteLinksMapping } from '../inviteLinks/mapping';
import { redeemInviteLink } from '../inviteLinks/mutations';
import { conflict } from '../errors';
import { connector } from '../db/helpers';
import { hub } from '../events';
import { deletePushSubscription, listPushSubscriptionsByAccount } from '../pushSubscriptions';
import { profilesCache } from '../profiles/cache';
import { listProfilesByAccount } from '../profiles';


export const createAccount = async (
  accountCreationData: AccountCreationData,
) => {
  const { db } = await allpeepDb();
  const coreConfig = await config();
  const communityConf = await communityConfig();

  const { email, password, emailValidated = false, inviteCode } = accountCreationData;

  const normalizedEmail = normalizeEmailAddress(email)!; // We know that email is not undefined because of the schema

  const firstAccount = (await accountsMapping.count(db)) === 0;

  if (await findAccountByEmail(normalizedEmail)) {
    throw conflict({ errorKey: 'emailAlreadyTaken', parameters: { email: normalizedEmail } });
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

  let profile: ProfileWithMeta | undefined;
  if (accountCreationData.profile) {
    const { handle, displayName, avatar } = accountCreationData.profile;

    profile = await profilesMapping.create(db, {
      handle,
      displayName,
      avatar,
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
      await hub.emit("profileCreated", profile);
      const registrationRoleKeys = communityConf.roles.onRegistration.add;

      for (const roleKey of registrationRoleKeys) {
        const role = await findRoleByKey(roleKey);
        if (role) {
          await assignRole(profile, role);
        } else {
          log.error(`Role ${roleKey} missing`);
        }
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

  const account = await accountsMapping.update(
    db,
    accountData.account.id as string,
    {
      email: normalizeEmailAddress(accountData.email),
      passwordHash: accountData.password
        ? await hash(accountData.password, 12)
        : undefined,
      emailValidated: accountData.emailValidated,
    },
  );

  const profile = (await listProfilesByAccount(account))[0];
  await profilesCache.del(profile.id)

  if (account && accountData.emailValidated === false) {
    await sendEmailValidationMail(account);
  }

  return { account };
};

export const deleteAccount = async (account: Account) => {
  const { db } = await allpeepDb();
  await accountsMapping.delete(db, account.id);
  const subscriptions = await listPushSubscriptionsByAccount(account);
  await Promise.all(subscriptions.map(async (sub) => await deletePushSubscription(sub.id)))
};

export const sendResetPasswordEmail = async (account: Account) => {
  const authorization = createAuthorization(account.id);

  const jwt = await jwtUtil();
  const token = await jwt.sign(authorization, '1d');

  const resetPasswordLink = `${await serverRootUrl()}/auth/reset-password#token=${token}`;

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

      for (const roleKey of communityConf.roles.onEmailValidation.add) {
        const role = await findRoleByKey(roleKey);
        if (role) {
          await assignRole(account.profiles[0], role);
        } else {
          log.error(`Role ${roleKey} missing`);
        }
      }
      for (const roleKey of communityConf.roles.onEmailValidation.remove) {
        const role = await findRoleByKey(roleKey);
        if (role) {
          await unassignRole(account.profiles[0], role);
        } else {
          log.error(`Role ${roleKey} missing`);
        }
      }
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
