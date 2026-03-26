import { map } from "@openpeeps/arango-querybuilder";
import { Relation } from "@openpeeps/arango-querybuilder/types";
import { InviteLinkData, InviteLinkWithMeta } from "@openpeeps/common/types";
import { profilesMapping } from "../profiles/mapping";

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
});