import { map, Relation } from '../db/pg/map';
import { InviteLinkData, InviteLinkWithMeta } from '@openpeeps/common/types';
import { profilesMapping } from '../profiles/mapping';
import { groupsMapping } from '../groups/mapping';

const inviteLinkRelations: Relation[] = [
  {
    alias: 'profile',
    edgeCollection: 'inviteLinkCreators',
    direction: 'INBOUND',
    skipEdge: true,
    mapping: profilesMapping.data(),
    cardinality: 'one',
  },
  {
    alias: 'redemptions',
    edgeCollection: 'inviteLinkRedeemers',
    direction: 'INBOUND',
    skipEdge: true,
    mapping: profilesMapping.data(),
    cardinality: 'many',
  },
];

export const inviteLinksMapping = map<InviteLinkData, InviteLinkWithMeta>({
  collection: 'inviteLinks',
  relations: inviteLinkRelations,
  // `groupIds` is a scalar array of group ids; resolve it through the groups
  // mapping so the listing can show which groups an invite targets.
  foreignKeyRelations: [
    {
      alias: 'groups',
      foreignKeyProperty: 'groupIds',
      cardinality: 'many',
      mapping: groupsMapping.data(),
    },
  ],
});
