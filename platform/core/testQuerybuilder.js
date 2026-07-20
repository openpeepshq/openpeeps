import { map } from '@openpeeps/arango-querybuilder';
import { Database } from 'arangojs';

const basePostRelations = [
  {
    alias: 'mentions',
    edgeCollection: 'mentions',
    direction: 'OUTBOUND',
    vertexAlias: 'profile',
  },
  {
    alias: 'audience',
    edgeCollection: 'audience',
    direction: 'OUTBOUND',
    skipEdge: true,
  },
  {
    alias: 'reactions',
    edgeCollection: 'reactions',
    direction: 'INBOUND',
    vertexAlias: 'profile',
  },
  {
    alias: 'repostCount',
    edgeCollection: 'repost',
    direction: 'INBOUND',
    count: true,
  },
  {
    alias: 'replyCount',
    edgeCollection: 'replyTo',
    direction: 'INBOUND',
    count: true,
  },
  {
    alias: 'entries',
    edgeCollection: 'entries',
    direction: 'INBOUND',
    vertexAlias: 'profile',
  },
];

const replyToRelation = {
  alias: 'replyTo',
  edgeCollection: 'replyTo',
  direction: 'OUTBOUND',
  skipEdge: true,
  cardinality: 'one',
  subrelations: [...basePostRelations],
};

const repostRelation = {
  alias: 'repost',
  edgeCollection: 'repost',
  direction: 'OUTBOUND',
  skipEdge: true,
  cardinality: 'one',
  subrelations: [...basePostRelations, replyToRelation],
};

const allPostRelations = [
  ...basePostRelations,
  repostRelation,
  replyToRelation,
];

const posts = map({
  collection: 'posts',
  relations: allPostRelations,
  derivedProperties: [
    {
      alias: 'test',
      expression: 'DOC.createdAt',
    },
  ],
  sort: [['DOC.createdAt', 'DESC']],
});

console.log(posts.query());

const db = new Database({
  url: 'http://localhost:8529',
});

const result = await db.query(posts.query()).then((q) => q.all());

console.log(result.find((p) => p.repost !== null));
