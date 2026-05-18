import { randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import ffmpeg from 'fluent-ffmpeg';
import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import { mediaStorage } from './index';
import {
  ensureStreamDir,
  HLS_ERRORS_LOG,
  HLS_MASTER_PLAYLIST,
} from './streaming';

const log = logger('app:media:streamingJobs');

export interface MediaStreamingJobData {
  storageId: string;
}

const VARIANT_PLAYLIST = 'stream.m3u8';
const SEGMENT_PATTERN = 'segment_%05d.ts';
const HLS_SEGMENT_DURATION_SEC = 6;
// ffmpeg writes the master playlist incrementally during VOD encodes, so we
// can't rely on its presence as a "done" marker. Have ffmpeg write to a
// non-final name and rename atomically to `hls.m3u8` after the encode
// completes successfully.
const MASTER_PLAYLIST_TEMP_NAME = '_master.m3u8';
const AUDIO_BITRATE_KBPS = 128;

interface LadderRung {
  /** Target for the shorter side of the frame, in pixels. */
  shorterSide: number;
  /** Target video bitrate in kbps. */
  videoBitrateKbps: number;
  /** Hard ceiling for the variant's instantaneous bitrate (kbps). */
  maxBitrateKbps: number;
}

/**
 * Bitrate ladder roughly following the Apple HLS Authoring Spec. Each rung
 * targets the shorter side of the frame so the rule works for both landscape
 * and portrait sources (a "720p" rung means the shorter side is 720, with the
 * longer side scaled to match the source aspect ratio).
 */
const LADDER: LadderRung[] = [
  { shorterSide: 1080, videoBitrateKbps: 4500, maxBitrateKbps: 6750 },
  { shorterSide: 720, videoBitrateKbps: 2800, maxBitrateKbps: 4200 },
  { shorterSide: 480, videoBitrateKbps: 1000, maxBitrateKbps: 1500 },
  { shorterSide: 360, videoBitrateKbps: 500, maxBitrateKbps: 750 },
];

const SOURCE_BITRATE_FALLBACK_KBPS: Record<number, number> = {
  // Rough defaults if ffprobe can't tell us the source video bitrate (e.g.
  // weird containers). Indexed by shorter-side resolution.
  2160: 16000,
  1440: 9000,
  1080: 5000,
  720: 3000,
  480: 1500,
  360: 800,
  240: 500,
};

interface ProbedSource {
  width: number;
  height: number;
  videoBitrateKbps: number;
  hasAudio: boolean;
}

const probeSource = (inputPath: string): Promise<ProbedSource> =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const video = metadata.streams.find((s) => s.codec_type === 'video');
      if (!video || !video.width || !video.height) {
        reject(new Error('No video stream found in source'));
        return;
      }
      const hasAudio = metadata.streams.some((s) => s.codec_type === 'audio');

      // `bit_rate` on the video stream is the most accurate signal. Fall back
      // to the container-level bitrate (which includes audio) minus a rough
      // audio allowance, then to a resolution-based heuristic.
      const streamBitrate = Number(video.bit_rate);
      let videoBitrateKbps = Number.isFinite(streamBitrate) && streamBitrate > 0
        ? Math.round(streamBitrate / 1000)
        : 0;
      if (!videoBitrateKbps) {
        const formatBitrate = Number(metadata.format.bit_rate);
        if (Number.isFinite(formatBitrate) && formatBitrate > 0) {
          videoBitrateKbps = Math.max(
            100,
            Math.round(formatBitrate / 1000) - (hasAudio ? AUDIO_BITRATE_KBPS : 0),
          );
        }
      }
      if (!videoBitrateKbps) {
        const shorter = Math.min(video.width, video.height);
        const fallback =
          Object.entries(SOURCE_BITRATE_FALLBACK_KBPS)
            .map(([s, kbps]) => ({ s: Number(s), kbps }))
            .filter(({ s }) => s <= shorter)
            .sort((a, b) => b.s - a.s)[0]?.kbps ?? 500;
        videoBitrateKbps = fallback;
      }

      resolve({
        width: video.width,
        height: video.height,
        videoBitrateKbps,
        hasAudio,
      });
    });
  });

interface Variant {
  /** Width in pixels, always even (libx264 requires divisible by 2). */
  width: number;
  /** Height in pixels, always even. */
  height: number;
  videoBitrateKbps: number;
  maxBitrateKbps: number;
}

const roundEven = (n: number): number => {
  const r = Math.round(n);
  return r % 2 === 0 ? r : r + (r > 0 ? 1 : -1);
};

/**
 * Scales `src` so the shorter side equals `targetShorter`, preserving the
 * source aspect ratio and rounding both dimensions to even numbers (required
 * by libx264). Returns the source unchanged if it's already at-or-below the
 * target (we never upscale).
 */
const scaleToShorterSide = (
  srcWidth: number,
  srcHeight: number,
  targetShorter: number,
): { width: number; height: number } => {
  const srcShorter = Math.min(srcWidth, srcHeight);
  if (targetShorter >= srcShorter) {
    return { width: roundEven(srcWidth), height: roundEven(srcHeight) };
  }
  const ratio = targetShorter / srcShorter;
  return {
    width: roundEven(srcWidth * ratio),
    height: roundEven(srcHeight * ratio),
  };
};

/**
 * Picks the set of variants to encode based on the source resolution and
 * bitrate.
 *
 * Rules:
 * - Never upscale (rung's shorter side must be ≤ source shorter side).
 * - Never spend an encode pass that's within ~15% of the source bitrate.
 * - If no rung is eligible (very small / low-bitrate source), produce a
 *   single source-quality rung so the output is always playable.
 *
 * See the discussion of "why ~1.2 Mbps cutoff" — the rung bitrates below
 * encode the same heuristic: rungs with `videoBitrateKbps > srcBitrate*0.85`
 * are dropped, so a 1 Mbps source ends up with just the 500 kbps rung (or
 * just the source rung, depending on its size).
 */
const pickVariants = (source: ProbedSource): Variant[] => {
  const srcShorter = Math.min(source.width, source.height);
  const eligible = LADDER.filter(
    (r) =>
      r.shorterSide <= srcShorter &&
      r.videoBitrateKbps <= source.videoBitrateKbps * 0.85,
  );

  if (eligible.length > 0) {
    return eligible.map((rung) => {
      const { width, height } = scaleToShorterSide(
        source.width,
        source.height,
        rung.shorterSide,
      );
      return {
        width,
        height,
        videoBitrateKbps: rung.videoBitrateKbps,
        maxBitrateKbps: rung.maxBitrateKbps,
      };
    });
  }

  // Fallback: single variant matching the source. We still re-encode to
  // normalise the codec to H.264 baseline so the output is reliably playable
  // on the broadest range of devices, but we keep dimensions and pick a
  // bitrate that won't degrade quality.
  const bitrate = Math.max(400, source.videoBitrateKbps);
  return [
    {
      width: roundEven(source.width),
      height: roundEven(source.height),
      videoBitrateKbps: bitrate,
      maxBitrateKbps: Math.round(bitrate * 1.5),
    },
  ];
};

const buildFilterComplex = (variants: Variant[]): string => {
  if (variants.length === 1) {
    return `[0:v]scale=${variants[0].width}:${variants[0].height}[v0]`;
  }
  const splitLabels = variants.map((_, i) => `[s${i}]`).join('');
  const split = `[0:v]split=${variants.length}${splitLabels}`;
  const scales = variants
    .map(
      (v, i) =>
        `[s${i}]scale=${v.width}:${v.height}:flags=lanczos[v${i}]`,
    )
    .join('; ');
  return `${split}; ${scales}`;
};

const buildVariantOutputOptions = (
  variants: Variant[],
  hasAudio: boolean,
): string[] => {
  const opts: string[] = [];
  variants.forEach((v, i) => {
    opts.push(`-map`, `[v${i}]`);
    opts.push(`-c:v:${i}`, 'libx264');
    opts.push(`-b:v:${i}`, `${v.videoBitrateKbps}k`);
    opts.push(`-maxrate:v:${i}`, `${v.maxBitrateKbps}k`);
    // 2-second buffer at maxrate is a reasonable default for VOD ABR.
    opts.push(`-bufsize:v:${i}`, `${v.maxBitrateKbps * 2}k`);
  });
  if (hasAudio) {
    variants.forEach((_, i) => {
      opts.push(`-map`, 'a:0');
      opts.push(`-c:a:${i}`, 'aac');
      opts.push(`-b:a:${i}`, `${AUDIO_BITRATE_KBPS}k`);
      // The `a:` prefix is critical here. Without it, `-ac:${i}` targets the
      // i-th output stream of ANY type — which is one of the video variants,
      // not the audio. ffmpeg responds to that with a generic "Conversion
      // failed!" with no useful detail.
      opts.push(`-ac:a:${i}`, '2');
    });
  }
  return opts;
};

const runHls = async (
  inputPath: string,
  streamDir: string,
  source: ProbedSource,
  variants: Variant[],
): Promise<void> => {
  // Each variant gets its own subdirectory so segment filenames never collide.
  await Promise.all(
    variants.map((_, i) => fs.mkdir(join(streamDir, `v${i}`), { recursive: true })),
  );

  const segmentTemplate = join(streamDir, `v%v`, SEGMENT_PATTERN);
  const variantPlaylistTemplate = join(streamDir, `v%v`, VARIANT_PLAYLIST);

  // `var_stream_map` tells the HLS muxer which (video, audio) pairs to bundle
  // into each variant. Audio is duplicated per-variant (a:0, a:1, …) because
  // we want each variant to carry its own audio track for simplicity.
  const streamMap = variants
    .map((_, i) =>
      source.hasAudio ? `v:${i},a:${i}` : `v:${i}`,
    )
    .join(' ');

  const outputOptions = [
    '-filter_complex',
    buildFilterComplex(variants),
    ...buildVariantOutputOptions(variants, source.hasAudio),
    // Encoder presets — applied to every video output. `main` profile is a
    // good balance between device compatibility and compression efficiency.
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'veryfast',
    // Keyframe alignment: place an IDR every `HLS_SEGMENT_DURATION_SEC`
    // seconds so segments are independently decodable.
    '-g',
    String(HLS_SEGMENT_DURATION_SEC * 30),
    '-keyint_min',
    String(HLS_SEGMENT_DURATION_SEC * 30),
    '-sc_threshold',
    '0',
    '-f',
    'hls',
    `-hls_time`,
    String(HLS_SEGMENT_DURATION_SEC),
    '-hls_playlist_type',
    'vod',
    '-hls_flags',
    'independent_segments',
    '-hls_segment_filename',
    segmentTemplate,
    '-master_pl_name',
    MASTER_PLAYLIST_TEMP_NAME,
    // NOTE: `-var_stream_map` is passed separately below. fluent-ffmpeg splits
    // any single array element containing exactly one space into two argv
    // tokens, which breaks values like `v:0,a:0 v:1,a:1` and makes ffmpeg
    // treat `v:1,a:1` as an output filename.
  ];

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(outputOptions)
      // Two-arg form disables fluent-ffmpeg's space-splitting heuristic.
      .outputOptions('-var_stream_map', streamMap)
      .output(variantPlaylistTemplate)
      .on('start', (cmd) =>
        log.debug(`ffmpeg command: ${cmd}`),
      )
      .on('end', () => resolve())
      .on('error', (err, _stdout, stderr) => {
        // fluent-ffmpeg's `err.message` is just "ffmpeg exited with code N:
        // Conversion failed!" — the actual diagnostic is in stderr. We attach
        // the last ~40 lines so the worker log (and errors.log) show what
        // ffmpeg actually complained about instead of a useless exit code.
        const tail = String(stderr ?? '')
          .trim()
          .split(/\r?\n/)
          .slice(-40)
          .join('\n');
        const detail = tail
          ? `${err.message}\n--- ffmpeg stderr (tail) ---\n${tail}`
          : err.message;
        const wrapped = new Error(detail);
        // Preserve the original stack for debugging while keeping the rich
        // message on `.message` for log lines.
        if (err.stack) wrapped.stack = err.stack;
        reject(wrapped);
      })
      .run();
  });
};

const finalizeMasterPlaylist = async (streamDir: string): Promise<void> => {
  const tempPath = join(streamDir, MASTER_PLAYLIST_TEMP_NAME);
  const finalPath = join(streamDir, HLS_MASTER_PLAYLIST);
  // Atomic rename so consumers polling for `hls.m3u8` only ever see the
  // playlist once the encode is fully complete.
  await fs.rename(tempPath, finalPath);
};

const writeFileFromStorageToTemp = async (storageId: string): Promise<string> => {
  const storage = await mediaStorage();
  const tempPath = join(
    tmpdir(),
    `hls-input-${storageId}-${randomBytes(8).toString('hex')}`,
  );
  const webStream = (await storage.getStream(storageId)) as unknown as
    | import('node:stream/web').ReadableStream<Uint8Array>
    | undefined;
  if (!webStream) {
    throw new Error(`Source file not found in storage: ${storageId}`);
  }
  await pipeline(Readable.fromWeb(webStream), createWriteStream(tempPath));
  return tempPath;
};

const writeErrorsLog = async (
  streamDir: string,
  message: string,
): Promise<void> => {
  const errorsPath = join(streamDir, HLS_ERRORS_LOG);
  try {
    await fs.writeFile(errorsPath, message + '\n', 'utf8');
  } catch (e) {
    log.error(`Failed to write ${errorsPath}: ${(e as Error).message}`);
  }
};

const [mediaStreamingQueue, mediaStreamingWorker] = queueAndWorker<
  MediaStreamingJobData,
  void
>(
  'media-streaming',
  async (job) => {
    const { storageId } = job.data;
    log.info(`Starting HLS transcoding for ${storageId}`);

    const streamDir = await ensureStreamDir(storageId);

    let inputPath: string | undefined;
    try {
      await fs.unlink(join(streamDir, HLS_ERRORS_LOG)).catch(() => {});

      inputPath = await writeFileFromStorageToTemp(storageId);
      const source = await probeSource(inputPath);
      const variants = pickVariants(source);
      log.info(
        `HLS for ${storageId}: source ${source.width}x${source.height} ` +
          `@${source.videoBitrateKbps}kbps → ${variants.length} variant(s): ` +
          variants
            .map(
              (v) =>
                `${v.width}x${v.height}@${v.videoBitrateKbps}kbps`,
            )
            .join(', '),
      );
      await runHls(inputPath, streamDir, source, variants);
      await finalizeMasterPlaylist(streamDir);
      log.info(`HLS transcoding for ${storageId} finished`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      log.error(`HLS transcoding for ${storageId} failed: ${message}`);
      await writeErrorsLog(streamDir, message);
      throw error;
    } finally {
      if (inputPath) {
        await fs.unlink(inputPath).catch(() => {});
      }
    }
  },
  {
    defaultJobOptions: {
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 * 7, count: 50 },
    },
  },
);

export { mediaStreamingQueue, mediaStreamingWorker };
