import type { AiConfig, AiProbeReport } from '@openpeepshq/common/types';
import {
  CORPUS_SCOPE,
  DEFAULT_EMBEDDING_INSTRUCTION,
  EMBEDDING_DIMENSIONS,
} from './constants';

export type StoredSpace = {
  model: string;
  instruction: string;
  dimension: number;
  spaceScope: string;
};

export type ProbeFacts = {
  config: AiConfig;
  embeddingSmokeOk: boolean;
  transcriptionReachable: boolean;
  sentimentReachable: boolean;
  languageReachable: boolean;
  columnsOk: boolean;
  corpusSpace: StoredSpace | null;
};

export type ProbeDecision = AiProbeReport & { createCorpusSpace: boolean };

const endpointSet = (endpoint: string) => endpoint.trim().length > 0;

const embeddingConfigured = (config: AiConfig) =>
  endpointSet(config.embedding.endpoint) &&
  config.embedding.credential.trim().length > 0 &&
  config.embedding.model.trim().length > 0;

const spaceMatches = (config: AiConfig, space: StoredSpace) =>
  space.spaceScope === CORPUS_SCOPE &&
  space.model === config.embedding.model &&
  space.instruction === DEFAULT_EMBEDDING_INSTRUCTION &&
  space.dimension === config.embedding.dimension &&
  space.dimension === EMBEDDING_DIMENSIONS;

/**
 * Pure probe decision. A fingerprint mismatch keeps RAG off and does not
 * replace the stored space. Empty config reports every feature off.
 */
export const evaluateProbe = (facts: ProbeFacts): ProbeDecision => {
  const { config } = facts;
  let embedding: AiProbeReport['embedding'] = 'off';
  let createCorpusSpace = false;

  if (embeddingConfigured(config)) {
    if (!facts.embeddingSmokeOk || !facts.columnsOk) {
      embedding = 'failed';
    } else if (facts.corpusSpace && !spaceMatches(config, facts.corpusSpace)) {
      embedding = 'mismatch';
    } else {
      embedding = 'ok';
      createCorpusSpace = !facts.corpusSpace;
    }
  }

  const embeddingOk = embedding === 'ok';
  const transcriptionConfigured =
    config.transcription_enabled &&
    endpointSet(config.transcription.endpoint) &&
    config.transcription.credential.trim().length > 0 &&
    config.transcription.model.trim().length > 0;

  return {
    embedding,
    transcription: !config.transcription_enabled
      ? 'off'
      : !transcriptionConfigured
        ? 'failed'
        : facts.transcriptionReachable
          ? 'ok'
          : 'failed',
    sentiment: !endpointSet(config.sentiment.endpoint)
      ? 'off'
      : facts.sentimentReachable
        ? 'ok'
        : 'failed',
    language: !endpointSet(config.language.endpoint)
      ? 'off'
      : facts.languageReachable
        ? 'ok'
        : 'failed',
    rag: embeddingOk && config.rag_enabled ? 'ok' : 'off',
    topics: embeddingOk && config.topics_enabled ? 'ok' : 'off',
    createCorpusSpace,
  };
};
