import { aiConfig } from '../config';
import {
  PROVIDER_UPLOAD_TIMEOUT_MS,
  providerClient,
  providerReady,
  providerSignal,
  readError,
} from '../vectors/http';

export class TranscriptionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscriptionConfigError';
  }
}

export type TranscriptSegment = {
  start?: number;
  end?: number;
  text: string;
};

export type TranscriptResult = {
  text: string;
  segments: TranscriptSegment[];
};

/** Rejects a blank credential or a non-HTTP endpoint before any request. */
export const assertTranscriptionReady = async () => {
  const settings = await aiConfig();
  const provider = settings.transcription;
  if (!providerReady(provider)) {
    throw new TranscriptionConfigError(
      'transcription provider is missing an endpoint, credential, or model',
    );
  }
  return provider;
};

type TranscriptionBody = {
  text?: string;
  segments?: { start?: number; end?: number; text?: string }[];
};

const audioBytes = (audio: ArrayBuffer | SharedArrayBuffer | Uint8Array) => {
  const view = audio instanceof Uint8Array ? audio : new Uint8Array(audio);
  const buffer = new ArrayBuffer(view.byteLength);
  new Uint8Array(buffer).set(view);
  return buffer;
};

export const transcribeAudio = async (
  audio: ArrayBuffer | SharedArrayBuffer | Uint8Array,
  filename = 'audio.wav',
): Promise<TranscriptResult> => {
  const provider = await assertTranscriptionReady();
  const form = new FormData();
  form.append('model', provider.model);
  form.append('file', new Blob([audioBytes(audio)]), filename);
  if (provider.language) form.append('language', provider.language);
  const client = providerClient(provider);
  const response = await client.post('/audio/transcriptions', {
    body: form,
    signal: providerSignal(PROVIDER_UPLOAD_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(
      `transcription failed (${response.status}): ${await readError(response)}`,
    );
  }
  const body = (await response.json()) as TranscriptionBody;
  const segments = (body.segments ?? [])
    .map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: segment.text ?? '',
    }))
    .filter((segment) => segment.text.length > 0);
  const text = body.text ?? segments.map((segment) => segment.text).join(' ');
  return {
    text,
    segments: segments.length > 0 ? segments : text ? [{ text }] : [],
  };
};
