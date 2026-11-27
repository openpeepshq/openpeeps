import type { AiConfig } from '@openpeepshq/common/types';

export const defaultAiConfig: AiConfig = {
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
};
