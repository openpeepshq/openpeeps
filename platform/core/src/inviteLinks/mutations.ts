import {
  InviteLinkData,
  InviteLinkWithMeta,
  PublicProfile,
} from '@openpeeps/common/types';
import {
  createInviteLinkConnector,
  redeemInviteLinkConnector,
} from './helpers';
import { inviteLinksMapping } from './mapping';
import { allpeepDb } from '../db';
import { hub } from '../events';
import { addMembersToGroup } from '../groups/mutations';
import { findGroup } from '../groups/finders';
import { throwIfUndefined } from '../lib/utils';
import { logger } from '../log';

const log = logger('core:inviteLinks');

export const createInviteLink = async (
  inviteLinkData: InviteLinkData,
  profile: PublicProfile,
) => {
  const db = await allpeepDb().then((db) => db.db);
  const bareInviteLink = await inviteLinksMapping.create(db, inviteLinkData);
  await createInviteLinkConnector(db, profile, bareInviteLink);
  return throwIfUndefined(await inviteLinksMapping.find(db, bareInviteLink.id));
};

export const updateInviteLink = async (
  id: string,
  inviteLinkData: Partial<InviteLinkData>,
) => {
  const db = await allpeepDb().then((db) => db.db);
  return inviteLinksMapping.update(db, id, inviteLinkData);
};

export const redeemInviteLink = async (
  inviteLink: InviteLinkWithMeta,
  profile: PublicProfile,
) => {
  if (inviteLink.profile?.id === profile.id) {
    throw new Error('Invite link creator and redeemer cannot be the same');
  }

  await allpeepDb().then(({ db }) =>
    redeemInviteLinkConnector(db, profile, inviteLink),
  );

  const groupIds = [...new Set(inviteLink.groupIds ?? [])];
  const adder = inviteLink.profile;
  for (const groupId of groupIds) {
    const group = await findGroup(groupId);
    if (!group) {
      log.warn(`Invite redeem: group ${groupId} not found, skipping auto-join`);
      continue;
    }
    await addMembersToGroup(group, [profile]);
    if (adder) {
      await hub.emit('groupMemberAdded', group, profile, adder);
    }
  }
};
