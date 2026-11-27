import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { AiProbeReport } from '@openpeepshq/common/types';
import { aiConfig } from '../config';
import { database } from '../db';
import { logger } from '../log';
import {
  CORPUS_SCOPE,
  DEFAULT_EMBEDDING_INSTRUCTION,
  EMBEDDING_DIMENSIONS,
} from './constants';
import { embedTexts } from './embed';
import {
  isHttpUrl,
  providerClient,
  providerReady,
  providerSignal,
  responseReachable,
} from './http';
import { evaluateProbe, type StoredSpace } from './probeLogic';

const log = logger('app:vectors:probe');

const offReport = (): AiProbeReport => ({
  embedding: 'off',
  transcription: 'off',
  sentiment: 'off',
  language: 'off',
  rag: 'off',
  topics: 'off',
});

let report: AiProbeReport = offReport();

export const aiProbeReport = () => report;

const rowsOf = <T>(result: { rows: unknown }) => (result.rows ?? []) as T[];

const loadCorpusSpace = async (): Promise<StoredSpace | null> => {
  const db = await database();
  const result = await db.execute(sql`
    SELECT model, instruction, dimension, space_scope
    FROM embedding_spaces
    WHERE space_scope = ${CORPUS_SCOPE} AND is_active = true
    LIMIT 1
  `);
  const row = rowsOf<{
    model: string;
    instruction: string;
    dimension: number;
    space_scope: string;
  }>(result)[0];
  if (!row) return null;
  return {
    model: row.model,
    instruction: row.instruction,
    dimension: Number(row.dimension),
    spaceScope: row.space_scope,
  };
};

const columnsExist = async () => {
  try {
    const db = await database();
    await db.execute(sql`SELECT embedding FROM posts WHERE false`);
    return true;
  } catch (error) {
    log.warn({ err: error }, 'vector columns are not available');
    return false;
  }
};

const smokeEmbed = async () => {
  try {
    const [embedding] = await embedTexts(
      ['probe'],
      DEFAULT_EMBEDDING_INSTRUCTION,
    );
    return !!embedding && embedding.length === EMBEDDING_DIMENSIONS;
  } catch (error) {
    log.warn({ err: error }, 'embedding smoke request failed');
    return false;
  }
};

const smokeReachable = async (
  endpoint: string,
  credential: string,
  path: string | null,
) => {
  if (!isHttpUrl(endpoint)) return false;
  try {
    const client = providerClient({
      endpoint,
      credential,
      model: 'probe',
    });
    const response = path
      ? await client.post(path, { json: {}, signal: providerSignal() })
      : await client.post('', {
          json: { text: 'probe' },
          signal: providerSignal(),
        });
    return responseReachable(response.status);
  } catch (error) {
    log.warn({ err: error, endpoint }, 'provider probe failed');
    return false;
  }
};

const createCorpusSpace = async (model: string, dimension: number) => {
  const db = await database();
  await db.execute(sql`
    INSERT INTO embedding_spaces (
      id, model, instruction, dimension, space_scope, is_active
    )
    VALUES (
      ${uuidv7()}::uuid,
      ${model},
      ${DEFAULT_EMBEDDING_INSTRUCTION},
      ${dimension},
      ${CORPUS_SCOPE},
      true
    )
  `);
};

export const refreshAiProbe = async (): Promise<AiProbeReport> => {
  try {
    const config = await aiConfig();
    const embeddingOn =
      isHttpUrl(config.embedding.endpoint) &&
      config.embedding.credential.trim().length > 0 &&
      config.embedding.model.trim().length > 0;
    const [columnsOk, corpusSpace, embeddingSmokeOk] = await Promise.all([
      embeddingOn ? columnsExist() : Promise.resolve(false),
      embeddingOn ? loadCorpusSpace().catch(() => null) : Promise.resolve(null),
      embeddingOn ? smokeEmbed() : Promise.resolve(false),
    ]);
    const transcriptionOn =
      config.transcription_enabled && providerReady(config.transcription);
    const decision = evaluateProbe({
      config,
      columnsOk,
      corpusSpace,
      embeddingSmokeOk,
      transcriptionReachable: transcriptionOn
        ? await smokeReachable(
            config.transcription.endpoint,
            config.transcription.credential,
            '/audio/transcriptions',
          )
        : false,
      sentimentReachable: config.sentiment.endpoint
        ? await smokeReachable(
            config.sentiment.endpoint,
            config.sentiment.credential,
            null,
          )
        : false,
      languageReachable: config.language.endpoint
        ? await smokeReachable(
            config.language.endpoint,
            config.language.credential,
            null,
          )
        : false,
    });
    if (decision.createCorpusSpace) {
      try {
        await createCorpusSpace(
          config.embedding.model,
          config.embedding.dimension,
        );
      } catch (error) {
        log.warn(
          { err: error },
          'could not store the embedding-space fingerprint',
        );
      }
    }
    report = {
      embedding: decision.embedding,
      transcription: decision.transcription,
      sentiment: decision.sentiment,
      language: decision.language,
      rag: decision.rag,
      topics: decision.topics,
    };
  } catch (error) {
    log.error({ err: error }, 'AI probe failed closed');
    report = offReport();
  }
  log.info(report, 'AI probe');
  return report;
};
