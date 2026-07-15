import { map } from '@openpeeps/arango-querybuilder';
import { Relation } from '@openpeeps/arango-querybuilder/types';
import { AdminGroup, GroupData, GroupWithMeta } from '@openpeeps/common/types';
import { collectionInfos } from '../db/structure';

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

const lastPostAtProperty = {
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
};

export const groupsMapping = map<GroupData, GroupWithMeta>({
  collection: 'groups',
  relations: groupRelations,
  derivedProperties: [lastPostAtProperty],
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
      edgeFilter: `"admin" IN (DOC.roles || [])`,
      mapping: {
        collection: 'profiles',
        softDelete: true,
      },
    },
  ],
  derivedProperties: [
    lastPostAtProperty,
    {
      alias: 'postsCount',
      expression: `
                LENGTH(
                    FOR edge IN ${collectionInfos.postGroupsCollection.name}
                        FILTER edge._to == DOC._id
                        FOR post IN ${collectionInfos.postsCollection.name}
                            FILTER post._id == edge._from
                            FILTER post.deletedAt == null
                            RETURN 1
                )
            `,
    },
  ],
  softDelete: true,
});
