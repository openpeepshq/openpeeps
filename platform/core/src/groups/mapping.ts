import { map, Relation } from '../db/pg/map';
import { GroupData, GroupWithMeta } from '@openpeeps/common/types';
import { collectionInfos } from '../db';

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
  derivedProperties: [
    {
      alias: 'lastPostAt',
      expression: `
                FIRST(
                    FOR edge IN ${collectionInfos.postGroupsCollection.name}
                        FILTER edge._to == DOC._id
                        SORT edge.createdAt DESC
                        LIMIT 1
                        RETURN edge.createdAt
                )
            `,
    },
  ],
  softDelete: true,
});
