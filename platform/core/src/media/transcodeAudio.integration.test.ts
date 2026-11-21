import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { MediaContentError, transcodeIncomingMedia } from './index';
import { VOICE_NOTE_MAX_SECONDS } from '@openpeepshq/common/lib';

/**
 * End-to-end transcode test (review item 4): the real ffmpeg pipeline — a
 * generated WAV fixture is normalized to AAC-in-MP4 and the result is
 * ffprobe-probed to prove it actually decodes, and an over-cap fixture is
 * rejected by the probe before any transcode work. The mocked `fluent-ffmpeg`
 * suite (`transcodeAudio.test.ts`) cannot catch a broken ffmpeg invocation or
 * a corrupt output, which is what this test guards.
 *
 * `ffmpeg` is not installed in the unit-test image (node:24-alpine), so the
 * cases skip there — the same guard `createPreview.test.ts` uses for its audio
 * preview test. They run for real wherever ffmpeg is present (dev machines,
 * the app image), which is where the real pipeline matters.
 */

const hasFfmpeg = (): Promise<boolean> =>
  new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], (error) => resolve(!error));
  });

const probeDuration = (file: string): Promise<number> =>
  new Promise((resolve, reject) => {
    // Reuse the same ffprobe the production code shells out to.
    import('fluent-ffmpeg').then(({ default: ffmpeg }) =>
      ffmpeg.ffprobe(file, (err, meta) =>
        err
          ? reject(new Error(`ffprobe failed: ${err}`))
          : resolve(meta?.format?.duration ?? NaN),
      ),
    );
  });

/** Write a mono 16-bit PCM WAV of `seconds` of 440 Hz at 8 kHz (small). */
const createWav = async (outputPath: string, seconds: number) => {
  const rate = 8000;
  const count = Math.floor(rate * seconds);
  const data = Buffer.alloc(44 + count * 2);
  data.write('RIFF', 0, 'ascii');
  data.writeUInt32LE(36 + count * 2, 4);
  data.write('WAVE', 8, 'ascii');
  data.write('fmt ', 12, 'ascii');
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); // PCM
  data.writeUInt16LE(1, 22); // mono
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36, 'ascii');
  data.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    data.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 32767 * 0.5),
      44 + i * 2,
    );
  }
  await writeFile(outputPath, data);
};

describe('transcodeIncomingMedia — real ffmpeg pipeline (integration)', () => {
  const cleanupPaths: string[] = [];
  afterAll(async () => {
    await Promise.all(
      cleanupPaths.map((p) =>
        rm(p, { recursive: true, force: true }).catch(() => undefined),
      ),
    );
  });

  it('produces an .m4a that ffprobe decodes as AAC-in-MP4 at the expected duration', async () => {
    if (!(await hasFfmpeg())) return; // no ffmpeg in the unit-test image
    const dir = await mkdtemp(path.join(tmpdir(), 'op-transcode-'));
    cleanupPaths.push(dir);
    const input = path.join(dir, 'tone.wav');
    await createWav(input, 2);

    const result = await transcodeIncomingMedia(
      'audio',
      input,
      'tone.wav',
      'audio/wav',
    );

    expect(result.filename).toBe('tone.m4a');
    expect(result.mimetype).toBe('audio/mp4');
    expect(result.path).not.toBe(input);

    // The produced file is a real, decodable MP4/AAC container.
    const metadata = await import('fluent-ffmpeg').then(
      ({ default: ffmpeg }) =>
        new Promise<any>((resolve, reject) =>
          ffmpeg.ffprobe(result.path, (err, meta) =>
            err ? reject(err) : resolve(meta),
          ),
        ),
    );
    const stream = (metadata.streams ?? []).find(
      (s: { codec_type?: string }) => s.codec_type === 'audio',
    );
    expect(stream).toBeTruthy();
    expect(stream.codec_name).toBe('aac');
    expect(metadata.format.format_name).toContain('mp4');
    expect(Math.abs((metadata.format.duration ?? 0) - 2)).toBeLessThan(0.5);
  });

  it('rejects an over-cap file end-to-end (cap holds past the real ffprobe boundary)', async () => {
    if (!(await hasFfmpeg())) return;
    const dir = await mkdtemp(path.join(tmpdir(), 'op-transcode-'));
    cleanupPaths.push(dir);
    const input = path.join(dir, 'long.wav');
    await createWav(input, VOICE_NOTE_MAX_SECONDS + 2);

    await expect(
      transcodeIncomingMedia('audio', input, 'long.wav', 'audio/wav'),
    ).rejects.toBeInstanceOf(MediaContentError);
  });

  it('accepts a file exactly at the cap end-to-end', async () => {
    if (!(await hasFfmpeg())) return;
    const dir = await mkdtemp(path.join(tmpdir(), 'op-transcode-'));
    cleanupPaths.push(dir);
    const input = path.join(dir, 'edge.wav');
    await createWav(input, VOICE_NOTE_MAX_SECONDS);

    const result = await transcodeIncomingMedia(
      'audio',
      input,
      'edge.wav',
      'audio/wav',
    );
    expect(result.filename).toBe('edge.m4a');
    const duration = await probeDuration(result.path);
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThanOrEqual(VOICE_NOTE_MAX_SECONDS + 1);
  });
});
