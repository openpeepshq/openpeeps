import { map } from "@openpeeps/arango-querybuilder";
import { Relation } from "@openpeeps/arango-querybuilder/types";
import { GroupData, GroupWithMeta } from "@openpeeps/common/types";

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
            softDelete: true
        }
    },
];

export const groupsMapping = map<GroupData, GroupWithMeta>({
    collection: 'groups',
    relations: groupRelations,
    softDelete: true,
});