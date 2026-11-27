import { describe, expect, it } from 'vitest';
import {
  applyInstruction,
  DEFAULT_EMBEDDING_INSTRUCTION,
  KB_DOCUMENT_EMBEDDING_INSTRUCTION,
  KB_QUERY_EMBEDDING_INSTRUCTION,
} from './constants';
import { kMeans, TOPIC_SOURCE_TABLES } from './cluster';
import { evaluateProbe } from './probeLogic';
import { hitVisibleTo, postVisibleTo } from './visibility';
import { lexicalScore } from './search';
import { providerReady } from './http';
import type { AiConfig } from '@openpeepshq/common/types';

const emptyConfig = (): AiConfig => ({
  chat: { endpoint: '', credential: '', model: '' },
  embedding: { endpoint: '', credential: '', model: '', dimension: 2560 },
  transcription: { endpoint: '', credential: '', model: '', language: '' },
  sentiment: { endpoint: '', credential: '', model: '' },
  language: { endpoint: '', credential: '', model: '' },
  rag_enabled: false,
  topics_enabled: false,
  transcription_enabled: false,
  reranker: 'lexical',
  topic_cluster_k: 8,
  cluster_use_umap: false,
  topic_label_prompt: '',
});

const readyFacts = (config: AiConfig) => ({
  config,
  embeddingSmokeOk: true,
  transcriptionReachable: true,
  sentimentReachable: true,
  languageReachable: true,
  columnsOk: true,
  corpusSpace: null,
});

describe('embedding instructions', () => {
  it('concatenates instruction and text with no extra separator', () => {
    expect(applyInstruction(DEFAULT_EMBEDDING_INSTRUCTION, 'hello')).toBe(
      `${DEFAULT_EMBEDDING_INSTRUCTION}hello`,
    );
    expect(KB_DOCUMENT_EMBEDDING_INSTRUCTION).toBe('');
    expect(KB_QUERY_EMBEDDING_INSTRUCTION.startsWith('Instruct:')).toBe(true);
  });
});

describe('post visibility', () => {
  const author = { profileId: 'author', groupIds: ['g1'] };
  const member = { profileId: 'member', groupIds: ['g1'] };
  const stranger = { profileId: 'stranger', groupIds: [] as string[] };

  it('never returns direct posts, even to the author', () => {
    const post = {
      visibility: 'direct',
      creatorId: 'author',
      groupIds: [] as string[],
    };
    expect(postVisibleTo(post, author)).toBe(false);
    expect(postVisibleTo(post, stranger)).toBe(false);
  });

  it('returns private posts only to their author', () => {
    const post = {
      visibility: 'private',
      creatorId: 'author',
      groupIds: [] as string[],
    };
    expect(postVisibleTo(post, author)).toBe(true);
    expect(postVisibleTo(post, member)).toBe(false);
  });

  it('returns group posts to members and the author only', () => {
    const post = {
      visibility: 'group',
      creatorId: 'author',
      groupIds: ['g1'],
    };
    expect(postVisibleTo(post, member)).toBe(true);
    expect(postVisibleTo(post, author)).toBe(true);
    expect(postVisibleTo(post, stranger)).toBe(false);
  });

  it('hides posts from blocked profiles, but not the requester own', () => {
    const post = {
      visibility: 'public',
      creatorId: 'author',
      groupIds: [] as string[],
    };
    // The viewer blocked the author: the post is hidden from them.
    expect(
      postVisibleTo(post, {
        profileId: 'viewer',
        groupIds: [],
        blockedIds: ['author'],
      }),
    ).toBe(false);
    // No block edge between the two: the post is visible.
    expect(
      postVisibleTo(post, {
        profileId: 'viewer',
        groupIds: [],
        blockedIds: [],
      }),
    ).toBe(true);
    // The author's own post stays visible even if they block someone else;
    // the block edge only hides other people's posts from the viewer.
    expect(
      postVisibleTo(
        { visibility: 'public', creatorId: 'author', groupIds: [] },
        { profileId: 'author', groupIds: [], blockedIds: ['someone-else'] },
      ),
    ).toBe(true);
  });

  it('drops hidden hits and keeps public ones', () => {
    const hits = [
      {
        id: 'p1',
        collection: 'posts',
        visibility: 'direct',
        creatorId: 'author',
        groupIds: [],
      },
      {
        id: 'p2',
        collection: 'posts',
        visibility: 'private',
        creatorId: 'author',
        groupIds: [],
      },
      {
        id: 'p3',
        collection: 'posts',
        visibility: 'group',
        creatorId: 'author',
        groupIds: ['g1'],
      },
      {
        id: 'p4',
        collection: 'posts',
        visibility: 'public',
        creatorId: 'author',
      },
    ];
    const visible = hits.filter((hit) => hitVisibleTo(hit, stranger));
    expect(visible.map((hit) => hit.visibility)).toEqual(['public']);
  });

  it('drops blocked-creator hits in the re-filter', () => {
    const hit = {
      id: 'p1',
      collection: 'posts',
      visibility: 'public',
      creatorId: 'author',
    };
    expect(
      hitVisibleTo(hit, {
        profileId: 'viewer',
        groupIds: [],
        blockedIds: ['author'],
      }),
    ).toBe(false);
    expect(hitVisibleTo(hit, { profileId: 'viewer', groupIds: [] })).toBe(true);
  });

  it('fails closed when post metadata is missing', () => {
    // A hit with no `visibility` at all is treated as direct (hidden).
    expect(
      hitVisibleTo(
        { id: 'p1', collection: 'posts', creatorId: 'author' },
        { profileId: 'author', groupIds: [] },
      ),
    ).toBe(false);
    // A group hit with no `groupIds` is hidden even for a group member.
    expect(
      hitVisibleTo(
        {
          id: 'p1',
          collection: 'posts',
          visibility: 'group',
          creatorId: 'author',
        },
        { profileId: 'member', groupIds: ['g1'] },
      ),
    ).toBe(false);
  });

  it('hides profile hits from a blocked pair, both directions', () => {
    const hit = { id: 'blocked-profile', collection: 'profiles' };
    // The viewer blocked the profile: hidden from the viewer.
    expect(
      hitVisibleTo(hit, {
        profileId: 'viewer',
        groupIds: [],
        blockedIds: ['blocked-profile'],
      }),
    ).toBe(false);
    // The profile blocked the viewer (reverse direction, same pair): hidden.
    expect(
      hitVisibleTo(
        { id: 'viewer', collection: 'profiles' },
        {
          profileId: 'blocked-profile',
          groupIds: [],
          blockedIds: ['viewer'],
        },
      ),
    ).toBe(false);
    // No block edge: the profile hit is visible.
    expect(
      hitVisibleTo(hit, { profileId: 'viewer', groupIds: [], blockedIds: [] }),
    ).toBe(true);
  });
});

describe('AI probe', () => {
  it('reports every feature off when AI config is empty', () => {
    const decision = evaluateProbe(readyFacts(emptyConfig()));
    expect(decision.embedding).toBe('off');
    expect(decision.transcription).toBe('off');
    expect(decision.sentiment).toBe('off');
    expect(decision.language).toBe('off');
    expect(decision.rag).toBe('off');
    expect(decision.topics).toBe('off');
    expect(decision.createCorpusSpace).toBe(false);
  });

  it('keeps RAG off when the stored instruction does not match', () => {
    const config = emptyConfig();
    config.embedding = {
      endpoint: 'https://embed.example/v1',
      credential: 'secret',
      model: 'qwen',
      dimension: 2560,
    };
    config.rag_enabled = true;
    const decision = evaluateProbe({
      ...readyFacts(config),
      corpusSpace: {
        model: 'qwen',
        instruction: 'other instruction',
        dimension: 2560,
        spaceScope: 'corpus',
      },
    });
    expect(decision.embedding).toBe('mismatch');
    expect(decision.rag).toBe('off');
    expect(decision.createCorpusSpace).toBe(false);
  });

  it('keeps RAG off when the stored dimension does not match', () => {
    const config = emptyConfig();
    config.embedding = {
      endpoint: 'https://embed.example/v1',
      credential: 'secret',
      model: 'qwen',
      dimension: 2560,
    };
    config.rag_enabled = true;
    const decision = evaluateProbe({
      ...readyFacts(config),
      corpusSpace: {
        model: 'qwen',
        instruction: DEFAULT_EMBEDDING_INSTRUCTION,
        dimension: 768,
        spaceScope: 'corpus',
      },
    });
    // A silent space re-create would mix 2560-dim and 768-dim vectors in
    // one index, so the mismatch must fail closed without replacing it.
    expect(decision.embedding).toBe('mismatch');
    expect(decision.rag).toBe('off');
    expect(decision.createCorpusSpace).toBe(false);
  });
});

describe('lexical fusion', () => {
  it('fuses dense and lexical when the reranker is lexical', () => {
    expect(lexicalScore(0.8, 0.4, 'lexical', 'some query')).toBeCloseTo(
      0.8 * 0.75 + 0.4 * 0.25,
    );
    expect(lexicalScore(0.8, 0.4, 'lexical', 'some query')).toBeCloseTo(0.7);
  });

  it('yields a pure dense score for a non-lexical reranker or no query text', () => {
    expect(lexicalScore(0.8, 0.4, 'none', 'some query')).toBe(0.8);
    expect(lexicalScore(0.8, 0.4, 'lexical', undefined)).toBe(0.8);
    expect(lexicalScore(0.8, 0.4, 'lexical', '')).toBe(0.8);
  });
});

describe('topic clustering', () => {
  it('does not read the knowledge base', () => {
    expect(TOPIC_SOURCE_TABLES).not.toContain('community_knowledge');
  });

  it('separates two obvious clusters', () => {
    const vectors = [
      [1, 0],
      [0.9, 0.1],
      [0, 1],
      [0.1, 0.9],
    ];
    const { assignments, centroids } = kMeans(vectors, 2);
    expect(centroids).toHaveLength(2);
    expect(assignments[0]).toBe(assignments[1]);
    expect(assignments[2]).toBe(assignments[3]);
    expect(assignments[0]).not.toBe(assignments[2]);
  });

  it('keeps finite centroids when k exceeds the number of distinct points', () => {
    // k > distinct points forces an empty cluster, so `mean` returns
    // undefined and the previous centroid must be kept (not NaN).
    const { assignments, centroids } = kMeans(
      [
        [1, 0],
        [1, 0],
      ],
      5,
    );
    expect(centroids).toHaveLength(2);
    expect(assignments).toHaveLength(2);
    for (const centroid of centroids) {
      expect(centroid.every((value) => Number.isFinite(value))).toBe(true);
    }
  });

  it('tolerates duplicate points and zero vectors', () => {
    const { assignments, centroids } = kMeans(
      [
        [0, 0],
        [0, 0],
        [1, 1],
      ],
      3,
    );
    expect(centroids).toHaveLength(3);
    expect(assignments).toHaveLength(3);
    for (const centroid of centroids) {
      expect(centroid.every((value) => Number.isFinite(value))).toBe(true);
    }
  });
});

describe('transcription provider guard', () => {
  it('rejects a blank credential or a bad URL', () => {
    expect(
      providerReady({
        endpoint: 'https://stt.example/v1',
        credential: '',
        model: 'whisper',
      }),
    ).toBe(false);
    expect(
      providerReady({
        endpoint: 'not a url',
        credential: 'secret',
        model: 'whisper',
      }),
    ).toBe(false);
    expect(
      providerReady({
        endpoint: 'https://stt.example/v1',
        credential: 'secret',
        model: 'whisper',
      }),
    ).toBe(true);
  });
});
