import { aiConfig } from '../config';
import { applyInstruction, EMBEDDING_DIMENSIONS } from './constants';
import {
  providerClient,
  providerReady,
  providerSignal,
  readError,
} from './http';

type EmbeddingResponse = {
  data?: { embedding?: number[]; index?: number }[];
};

export const embedTexts = async (
  texts: string[],
  instruction: string,
): Promise<number[][]> => {
  if (texts.length === 0) return [];
  const settings = await aiConfig();
  const provider = settings.embedding;
  if (!providerReady(provider)) {
    throw new Error('embedding provider is not configured');
  }
  if (provider.dimension !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `embedding dimension ${provider.dimension} does not match the vector column`,
    );
  }
  const client = providerClient(provider);
  const response = await client.post('/embeddings', {
    json: {
      model: provider.model,
      input: texts.map((text) => applyInstruction(instruction, text)),
    },
    signal: providerSignal(),
  });
  if (!response.ok) {
    throw new Error(
      `embedding request failed (${response.status}): ${await readError(response)}`,
    );
  }
  const body = (await response.json()) as EmbeddingResponse;
  const rows = [...(body.data ?? [])].sort(
    (left, right) => (left.index ?? 0) - (right.index ?? 0),
  );
  if (rows.length !== texts.length) {
    throw new Error('embedding response length does not match the input');
  }
  return rows.map((row) => {
    const embedding = row.embedding ?? [];
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `embedding length ${embedding.length} does not match ${EMBEDDING_DIMENSIONS}`,
      );
    }
    return embedding;
  });
};

export const embed = (texts: string[], instruction: string) =>
  embedTexts(texts, instruction);

export const embedQuery = (text: string, instruction: string) =>
  embedTexts([text], instruction).then((rows) => rows[0] ?? []);
