import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { database } from '../db';
import { findJamRecording } from '../jams/finders';
import { mediaStorage } from '../media';
import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import { enqueueNlpIngest } from '../vectors/ingest';
import { aiProbeReport } from '../vectors/probe';
import { transcribeAudio, type TranscriptSegment } from './client';

const log = logger('app:transcription');

export const TRANSCRIBER_AGENT_NAME = 'peeps-jam-transcriber';

const rowsOf = <T>(result: { rows: unknown }) => (result.rows ?? []) as T[];

export const writeJamTranscript = async (input: {
  jamId: string;
  recordingId: string;
  segments: TranscriptSegment[];
}) => {
  const db = await database();
  const existing = await db.execute(sql`
    SELECT id::text AS id FROM jam_transcripts WHERE recording_id = ${input.recordingId}
  `);
  const id = rowsOf<{ id: string }>(existing)[0]?.id ?? uuidv7();
  const segments = JSON.stringify(input.segments);
  if (rowsOf<{ id: string }>(existing)[0]) {
    await db.execute(sql`
      UPDATE jam_transcripts
      SET segments = ${segments}::jsonb, updated_at = now()
      WHERE recording_id = ${input.recordingId}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO jam_transcripts (id, jam_id, recording_id, segments)
      VALUES (${id}::uuid, ${input.jamId}, ${input.recordingId}, ${segments}::jsonb)
    `);
  }
  return id;
};

export const appendJamTranscriptSegment = async (input: {
  jamId: string;
  recordingId: string;
  segment: TranscriptSegment;
}) => {
  const db = await database();
  const existing = await db.execute(sql`
    SELECT id::text AS id FROM jam_transcripts WHERE recording_id = ${input.recordingId}
  `);
  const segment = JSON.stringify([input.segment]);
  if (!rowsOf<{ id: string }>(existing)[0]) {
    await db.execute(sql`
      INSERT INTO jam_transcripts (id, jam_id, recording_id, segments)
      VALUES (
        ${uuidv7()}::uuid,
        ${input.jamId},
        ${input.recordingId},
        ${segment}::jsonb
      )
    `);
    return;
  }
  await db.execute(sql`
    UPDATE jam_transcripts
    SET segments = segments || ${segment}::jsonb, updated_at = now()
    WHERE recording_id = ${input.recordingId}
  `);
};

const [transcribeQueue, transcribeWorker] = queueAndWorker<
  { recordingId: string },
  unknown
>(
  'transcribe',
  async (job) => {
    if (aiProbeReport().transcription !== 'ok') return { skipped: true };
    const recording = await findJamRecording(job.data.recordingId);
    const attachmentId = recording?.attachment?.id;
    if (!recording || !attachmentId) {
      throw new Error(
        `recording ${job.data.recordingId} has no audio file yet`,
      );
    }
    const bytes = await (await mediaStorage()).getData(attachmentId);
    const transcript = await transcribeAudio(
      bytes,
      recording.attachment?.filename,
    );
    const transcriptId = await writeJamTranscript({
      jamId: recording.post.id,
      recordingId: recording.id,
      segments: transcript.segments,
    });
    await enqueueNlpIngest('jam_transcripts', transcriptId);
    await enqueueNlpIngest('posts', recording.post.id);
    log.info({ recordingId: recording.id }, 'jam transcript stored');
    return { transcriptId };
  },
  {
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { age: 86400 * 7, count: 50 },
    },
  },
);

export const transcribeJobQueue = transcribeQueue;
export const transcribeJobWorker = transcribeWorker;

export const enqueueTranscribe = (recordingId: string) =>
  transcribeQueue().add(
    'transcribe',
    { recordingId },
    { jobId: `transcribe:${recordingId}` },
  );
