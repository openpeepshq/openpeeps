import { map, Relation, RelationWithMapping } from '../db/pg/map';
import {
  AccountWithMeta,
  GroupMember,
  Profile,
  ProfileData,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { groupsMapping } from '../groups/mapping';
import { profileDerived } from '../db/pg/queries';

const membersExportStatsRelations: Relation[] = [
  {
    alias: 'reactionsCount',
    edgeCollection: 'reactions',
    direction: 'OUTBOUND',
    count: true,
    cardinality: 'one',
  },
];

export const profileAccountRelation: RelationWithMapping<AccountWithMeta> = {
  alias: 'controllers',
  edgeCollection: 'controls',
  direction: 'INBOUND',
  skipEdge: true,
  mapping: {
    collection: 'accounts',
    softDelete: true,
  },
  cardinality: 'many',
};

export const baseProfileRelations: Relation[] = [
  {
    alias: 'memberships',
    edgeCollection: 'userGroups',
    vertexAlias: 'group',
    direction: 'OUTBOUND',
    cardinality: 'many',
    mapping: groupsMapping.data(),
  },
  {
    alias: 'roles',
    edgeCollection: 'hasRole',
    direction: 'OUTBOUND',
    skipEdge: true,
    cardinality: 'many',
  },
  profileAccountRelation,
];

export const profileRelations: Relation[] = [
  ...baseProfileRelations,
  {
    alias: 'followers',
    edgeCollection: 'follows',
    direction: 'INBOUND',
    cardinality: 'many',
    skipEdge: true,
    mapping: {
      softDelete: true,
      collection: 'profiles',
      relations: baseProfileRelations,
    },
  },
  {
    alias: 'following',
    edgeCollection: 'follows',
    direction: 'OUTBOUND',
    skipEdge: true,
    cardinality: 'many',
    mapping: {
      softDelete: true,
      collection: 'profiles',
      relations: baseProfileRelations,
    },
  },
];

export const baseProfilesMapping = map<ProfileData, Profile>({
  collection: 'profiles',
  softDelete: true,
});

/** Lean mapping for public search results (memberships only). */
export const publicProfilesSearchMapping = map<ProfileData, ProfileWithMeta>({
  collection: 'profiles',
  softDelete: true,
  postFilterRelations: [
    {
      alias: 'memberships',
      edgeCollection: 'userGroups',
      vertexAlias: 'group',
      direction: 'OUTBOUND',
      cardinality: 'many',
      mapping: groupsMapping.data(),
    },
  ],
});

export const profilesMapping = map<ProfileData, ProfileWithMeta>({
  collection: 'profiles',
  postFilterRelations: profileRelations,
  softDelete: true,
  postFilterDerivedProperties: [
    {
      alias: 'profileStats',
      resolve: profileDerived.profileStats,
    },
  ],
});

export const membersExportMapping = baseProfilesMapping
  .addRelations(membersExportStatsRelations)
  .addDerivedProperty({
    alias: 'postsCount',
    resolve: profileDerived.postsCount,
  })
  .addDerivedProperty({
    alias: 'lastSeen',
    resolve: profileDerived.lastSeen,
  });

export const membersRelation: RelationWithMapping<
  ProfileWithMeta,
  GroupMember
> = {
  alias: 'members',
  vertexAlias: 'profile',
  edgeCollection: 'userGroups',
  direction: 'INBOUND',
  cardinality: 'many',
  mapping: baseProfilesMapping.data(),
};

export const profileRoleRelation: RelationWithMapping<Profile> = {
  alias: 'profiles',
  direction: 'INBOUND',
  edgeCollection: 'hasRole',
  mapping: baseProfilesMapping.data(),
  cardinality: 'many',
  skipEdge: true,
};

export const accountProfileRelation: RelationWithMapping<ProfileWithMeta> = {
  alias: 'profiles',
  edgeCollection: 'controls',
  direction: 'OUTBOUND',
  skipEdge: true,
  mapping: baseProfilesMapping.data(),
  cardinality: 'many',
};
