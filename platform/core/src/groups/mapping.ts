import { map, Relation } from '../db/pg/map';
import { GroupData, GroupWithMeta } from '@openpeeps/common/types';
import { computedFields } from '../db/pg/queries';

const groupRelations: Relation[] = [
  {
    alias: 'membersCount',
    edgeCollection: 'userGroups',
    direction: 'INBOUND',
    skipEdge: true,
    cardinality: 'one',
    count: true,
    mapping: {
      collection: `profiles`,
      softDelete: true,
    },
  },
];

export const groupsMapping = map<GroupData, GroupWithMeta>({
  collection: 'groups',
  relations: groupRelations,
  computedFields: [computedFields.groupLastPostAt()],
  softDelete: true,
});
