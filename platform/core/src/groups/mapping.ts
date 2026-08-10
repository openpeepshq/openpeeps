import { map, Relation } from '../db/pg/map';
import { AdminGroup, GroupData, GroupWithMeta } from '@openpeepshq/common/types';
import { computedFields } from '../db/pg/queries';
import { edgeFilters } from '../db/pg/filters';

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

const adminGroupComputedFields = [
  computedFields.groupLastPostAt(),
  computedFields.groupPostsCount(),
];

export const groupsMapping = map<GroupData, GroupWithMeta>({
  collection: 'groups',
  relations: groupRelations,
  computedFields: [computedFields.groupLastPostAt()],
  softDelete: true,
});

export const adminGroupsMapping = map<GroupData, AdminGroup>({
  collection: 'groups',
  relations: [
    ...groupRelations,
    {
      alias: 'admins',
      edgeCollection: 'userGroups',
      direction: 'INBOUND',
      skipEdge: true,
      cardinality: 'many',
      edgeFilter: edgeFilters.groupAdminRole(),
      mapping: {
        collection: 'profiles',
        softDelete: true,
      },
    },
  ],
  computedFields: adminGroupComputedFields,
  softDelete: true,
});
