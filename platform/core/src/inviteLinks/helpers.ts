import { connector } from '../db/helpers';
import { collectionInfos } from '../db';

export const redeemInviteLinkConnector = connector(
  collectionInfos.profilesCollection,
  collectionInfos.inviteLinksCollection,
  collectionInfos.inviteLinkRedeemersCollection,
);
export const createInviteLinkConnector = connector(
  collectionInfos.profilesCollection,
  collectionInfos.inviteLinksCollection,
  collectionInfos.inviteLinkCreatorsCollection,
);
