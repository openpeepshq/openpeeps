import { map, RelationWithMapping } from '../db/pg/map';
import {
  AccountData,
  AccountWithMeta,
  ProfileWithMeta,
  PushSubscription,
} from '@openpeeps/common/types';
import { pushSubscriptionsMapping } from '../pushSubscriptions/mapping';

export const profileAccountRelation: RelationWithMapping<ProfileWithMeta> = {
  alias: 'profiles',
  edgeCollection: 'controls',
  direction: 'OUTBOUND',
  skipEdge: true,
  mapping: {
    collection: 'profiles',
    softDelete: true,
  },
  cardinality: 'many',
};

export const pushSubscriptionsRelation: RelationWithMapping<PushSubscription> =
  {
    alias: 'pushSubscriptions',
    edgeCollection: 'accountToPushSubscription',
    direction: 'OUTBOUND',
    skipEdge: true,
    mapping: pushSubscriptionsMapping
      .removeRelation((r) => r.edgeCollection === 'accountToPushSubscription')
      .data(),
    cardinality: 'many',
  };

export const accountsMapping = map<AccountData, AccountWithMeta>({
  collection: 'accounts',
  postFilterRelations: [profileAccountRelation, pushSubscriptionsRelation],
  softDelete: false,
});
