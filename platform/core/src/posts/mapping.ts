import { map, Mapping, Relation, RelationWithMapping } from '../db/pg/map';
import { postFilters } from '../db/pg/filters';
import { profileDerived, postDerived } from '../db/pg/queries';
import { collectionInfos } from '../db';
import {
  EntryData,
  Post,
  Profile,
  DbPost,
  DbBasePost,
} from '@openpeepshq/common/types';
import { PostData } from '@openpeepshq/common/types';
import { groupsMapping } from '../groups/mapping';

const seenByCurrentProfileDerivedProperty = (profile?: { id: string }) => ({
  alias: 'seen',
  resolve: postDerived.seen(profile?.id),
});

const seenBatchByCurrentProfileDerivedProperty = (profile?: { id: string }) =>
  postDerived.seenBatch(profile?.id);

export const entriesRelation: Relation<Profile, EntryData> = {
  alias: 'entries',
  edgeCollection: 'entries',
  direction: 'INBOUND',
  vertexAlias: 'profile',
  // Keep create/edit authors even after the profile is soft-deleted so
  // historical posts (and nested replyTo) still serialize for API output.
  mapping: {
    collection: 'profiles',
    softDelete: false,
  },
  cardinality: 'many',
};

export const groupRelation: Relation = {
  alias: 'group',
  edgeCollection: 'postGroups',
  direction: 'OUTBOUND',
  skipEdge: true,
  cardinality: 'one',
  mapping: groupsMapping.data(),
};

const replyCountRelation: Relation = {
  alias: 'replyCount',
  edgeCollection: 'replyTo',
  direction: 'INBOUND',
  count: true,
  cardinality: 'one',
  mapping: {
    collection: 'posts',
    softDelete: true,
  },
};

const repostCountRelation: Relation = {
  alias: 'repostCount',
  edgeCollection: 'repost',
  direction: 'INBOUND',
  skipEdge: true,
  count: true,
  cardinality: 'one',
  mapping: {
    collection: 'posts',
    softDelete: true,
  },
};

const reactionsRelation: Relation = {
  alias: 'reactions',
  vertexAlias: 'profile',
  edgeCollection: 'reactions',
  direction: 'INBOUND',
  cardinality: 'many',
  mapping: {
    collection: 'profiles',
    softDelete: true,
  },
};

const audienceRelation: Relation = {
  alias: 'audience',
  edgeCollection: 'audience',
  direction: 'OUTBOUND',
  skipEdge: true,
  cardinality: 'many',
  mapping: {
    collection: 'profiles',
    softDelete: true,
  },
};

const mentionsRelation: Relation = {
  alias: 'mentions',
  edgeCollection: 'mentions',
  direction: 'OUTBOUND',
  vertexAlias: 'profile',
  cardinality: 'many',
  mapping: {
    collection: 'profiles',
    softDelete: true,
  },
};

const tagsRelation: Relation = {
  alias: 'tags',
  edgeCollection: 'postHashtags',
  direction: 'OUTBOUND',
  skipEdge: true,
  cardinality: 'many',
};

const basePostFilterRelations: Relation[] = [
  entriesRelation,
  audienceRelation,
  groupRelation,
  replyCountRelation,
  repostCountRelation,
  reactionsRelation,
  tagsRelation,
  mentionsRelation,
];

const preFilterMapData = {
  collection: 'posts',
  softDelete: true,
};

const basePostMapData = {
  ...preFilterMapData,
  postFilterRelations: basePostFilterRelations,
  postFilterDerivedProperties: [
    {
      alias: 'inReplyToId',
      resolve: postDerived.inReplyToId,
    },
    {
      alias: 'groupId',
      resolve: postDerived.groupId,
    },
  ],
};

const basePostMapDataForProfile = (profile?: { id: string }) => ({
  ...basePostMapData,
  postFilterDerivedProperties: [
    ...(basePostMapData.postFilterDerivedProperties || []),
    seenByCurrentProfileDerivedProperty(profile),
  ],
});

const replyPostMapData = {
  ...preFilterMapData,
  postFilterRelations: [entriesRelation],
};

const replyToRelation: Relation<DbBasePost> = {
  alias: 'replyTo',
  edgeCollection: 'replyTo',
  direction: 'OUTBOUND',
  skipEdge: true,
  cardinality: 'one',
  mapping: replyPostMapData,
};

export const repostRelation: RelationWithMapping<DbBasePost> = {
  alias: 'repost',
  edgeCollection: 'repost',
  direction: 'OUTBOUND',
  skipEdge: true,
  cardinality: 'one',
  mapping: {
    ...basePostMapData,
    postFilterRelations: [...basePostFilterRelations, replyToRelation],
  },
};

export const repostRelationForProfile = (profile?: {
  id: string;
}): RelationWithMapping<DbBasePost> => ({
  ...repostRelation,
  mapping: {
    ...basePostMapDataForProfile(profile),
    postFilterRelations: [...basePostFilterRelations, replyToRelation],
  },
});

export const repostsOfPostRelation: RelationWithMapping<DbPost> = {
  alias: 'reposts',
  edgeCollection: 'repost',
  direction: 'INBOUND',
  skipEdge: true,
  cardinality: 'many',
  mapping: {
    ...basePostMapData,
    postFilterRelations: [
      ...basePostFilterRelations,
      repostRelation,
      replyToRelation,
    ],
  },
};

export const repostsOfPostRelationForProfile = (profile?: {
  id: string;
}): RelationWithMapping<DbPost> => ({
  ...repostsOfPostRelation,
  mapping: {
    ...basePostMapDataForProfile(profile),
    postFilterRelations: [
      ...basePostFilterRelations,
      repostRelationForProfile(profile),
      replyToRelation,
    ],
  },
});

export const postsWithReplyCountMapping = map<
  PostData,
  Post & { replyCount: number }
>({
  collection: 'posts',
  relations: [replyCountRelation],
});

export const postsWithReplyToCountMapping = map<
  PostData,
  Post & { replyToCount: number }
>({
  collection: 'posts',
  relations: [
    {
      alias: 'replyToCount',
      edgeCollection: 'replyTo',
      direction: 'OUTBOUND',
      skipEdge: true,
      cardinality: 'one',
      count: true,
    },
  ],
});

export const postsMapping = map<PostData, DbPost>({
  ...basePostMapData,
  postFilterRelations: [
    ...basePostFilterRelations,
    repostRelation,
    replyToRelation,
  ],
});

export const postsMappingForProfile = (profile?: { id: string }) =>
  map<PostData, DbPost>({
    ...basePostMapDataForProfile(profile),
    postFilterRelations: [
      ...basePostFilterRelations,
      repostRelationForProfile(profile),
      replyToRelation,
    ],
  });

/** Lean mapping for post detail context — skips audience + nested repost. */
const contextPostFilterRelations: Relation[] = [
  entriesRelation,
  groupRelation,
  replyCountRelation,
  repostCountRelation,
  reactionsRelation,
  tagsRelation,
  mentionsRelation,
  replyToRelation,
];

export const postContextMappingForProfile = (profile?: { id: string }) =>
  map<PostData, DbPost>({
    ...preFilterMapData,
    postFilterRelations: contextPostFilterRelations,
    postFilterDerivedProperties: [
      {
        alias: 'inReplyToId',
        resolve: postDerived.inReplyToId,
      },
      {
        alias: 'groupId',
        resolve: postDerived.groupId,
      },
      seenBatchByCurrentProfileDerivedProperty(profile),
    ],
    limit: 100,
  });

export const contextRelation = (
  depth: number,
  direction: 'ancestors' | 'descendents',
  contextMapping: Mapping<DbPost> = postsMapping,
): RelationWithMapping<DbPost> => ({
  alias: 'context',
  edgeCollection: collectionInfos.repliesCollection.name,
  direction: direction === 'ancestors' ? 'OUTBOUND' : 'INBOUND',
  maxDepth: depth,
  cardinality: 'many',
  skipEdge: true,
  mapping: contextMapping.data(),
});

const conversationLeafFilters = [
  postFilters.replyCountZero(),
  postFilters.isDirect(),
];

export const conversationLeavesMapping = map<PostData, DbPost>({
  ...basePostMapData,
  relations: [replyCountRelation],
  filters: conversationLeafFilters,
});

export const conversationLeavesMappingForProfile = (profile?: { id: string }) =>
  map<PostData, DbPost>({
    ...basePostMapDataForProfile(profile),
    relations: [replyCountRelation],
    filters: conversationLeafFilters,
  });

export const postIdsMapping = map<PostData, { id: string }>(preFilterMapData);
