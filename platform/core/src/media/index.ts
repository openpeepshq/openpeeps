import type { MediaStorage } from '@openpeeps/common/types';
import { communityConfig, config } from '../config';

import openpeepsStorage from './openpeeps';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import path, { join } from 'node:path';
import { tmpdir } from 'node:os';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { getTheme, randomString } from '@openpeeps/common/lib';
import { execSync } from 'node:child_process';
import { logger } from '../log';
import { hub } from '../events';

let storagePromise: Promise<MediaStorage> | null = null;

const log = logger('app:media');

const previewMaxWidth = 700;

const initStorage = async () => {
  const {
    media: {
      storage: { params },
    },
  } = await config();
  hub.on('configUpdated', (namespace: string, name: string) => {
    if (namespace === 'openpeeps' && name === 'core') {
      storagePromise = null;
    }
  });
  return openpeepsStorage(params);
};

export const mediaStorage = () => {
  if (!storagePromise) {
    storagePromise = initStorage();
  }
  return storagePromise;
};

/**
 * A media source/output that lives on disk rather than in memory. The whole
 * processing pipeline passes these around so ffmpeg/sharp read and write files
 * directly — a multi-hundred-megabyte upload is never materialised as a
 * `Buffer`/`ArrayBuffer`. `mimetype` carries the type that the `File` used to.
 */
export interface MediaFile {
  path: string;
  mimetype: string;
}

const tempPathFor = (name: string): string =>
  join(tmpdir(), `media-${randomString(16)}${path.extname(name)}`);

/**
 * Stream a web `ReadableStream` to a temp file, preserving the original
 * extension so format-sniffing tools (audiowaveform, sharp) behave. Peak
 * memory is bounded by the write stream's highWaterMark, not the file size.
 */
export const writeStreamToTemp = async (
  stream: ReadableStream,
  name: string,
): Promise<string> => {
  const tempPath = tempPathFor(name);
  await pipeline(
    Readable.fromWeb(
      stream as unknown as import('node:stream/web').ReadableStream<Uint8Array>,
    ),
    createWriteStream(tempPath),
  );
  return tempPath;
};

/** Stream a stored object straight to a temp file (never fully buffered). */
export const writeStorageToTemp = async (
  storageId: string,
  name: string,
): Promise<string> => {
  const storage = await mediaStorage();
  const stream = await storage.getStream(storageId);
  if (!stream) {
    throw new Error(`Source file not found in storage: ${storageId}`);
  }
  return writeStreamToTemp(stream as unknown as ReadableStream, name);
};

/** Content-address and store a file by streaming it from disk. */
export const storeFromPath = (
  filePath: string,
): Promise<{ key: string; size: number }> =>
  mediaStorage().then((storage) =>
    storage.storeStream(
      Readable.toWeb(
        createReadStream(filePath),
      ) as unknown as Parameters<MediaStorage['storeStream']>[0],
    ),
  );

const transcodeVideo = async (inputPath: string): Promise<string> => {
  const { size } = await fs.stat(inputPath);
  const isLargeFile = size > 10 * 1024 * 1024;
  const tempOutputPath = join(tmpdir(), `output-${randomString(16)}.mp4`);

  const baseOutput = [
    '-c:v h264', // Better for iOS hardware acceleration
    '-profile:v baseline', // Ensures maximum device compatibility
    '-level 3.0', // Compatible with older iOS devices
    '-movflags +faststart', // Enables fast start for web playback
    '-pix_fmt yuv420p', // Required for iOS compatibility
    '-c:a aac', // AAC audio (iOS standard)
    '-b:a 128k', // Audio bitrate
    '-tune zerolatency', // Optimized for web streaming with minimal latency
    '-keyint_min 24', // Minimum "Group of Pictures"(GOP) size for better seeking
    '-g 24', // Standard GOP size
  ];
  if (isLargeFile) {
    baseOutput.push('-max_muxing_queue_size 9999'); // Helps with complex MOV files
  }
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .size(`${previewMaxWidth}x?`)
      .output(tempOutputPath)
      .outputOptions(baseOutput)
      .on('end', () => resolve(tempOutputPath))
      .on('error', reject)
      .run();
  });
};

/**
 * Returns the on-disk file to store for the attachment plus its final
 * filename. Videos are transcoded to a temp `.mp4` (a fresh path); everything
 * else is stored as-is (the returned `path` is the input itself).
 */
export const transcodeIncomingMedia = async (
  type: string,
  inputPath: string,
  originalName: string,
  sourceMimetype: string,
): Promise<MediaFile & { filename: string }> => {
  if (type === 'video') {
    return {
      path: await transcodeVideo(inputPath),
      filename: path.parse(originalName).name + '.mp4',
      mimetype: 'video/mp4',
    };
  }
  return { path: inputPath, filename: originalName, mimetype: sourceMimetype };
};

export const createPreview = async (
  inputPath: string,
  mimetype: string,
  originalName: string,
): Promise<MediaFile> => {
  switch (mimetype.split('/')[0]) {
    case 'image':
      return createImagePreview(inputPath, mimetype);
    case 'audio':
      return createAudioPreview(inputPath);
    case 'video':
      return createVideoPreview(inputPath);
    default:
      if (originalName.endsWith('.mkv')) {
        return createVideoPreview(inputPath);
      }
      return { path: inputPath, mimetype };
  }
};

const createImagePreview = async (
  inputPath: string,
  mimetype: string,
): Promise<MediaFile> => {
  const width = await sharp(inputPath)
    .metadata()
    .then((m) => m.width || 0);

  if (width <= previewMaxWidth) {
    return { path: inputPath, mimetype };
  }

  const outputPath = join(tmpdir(), `preview-${randomString(16)}.webp`);
  await sharp(inputPath).rotate().resize(previewMaxWidth).webp().toFile(outputPath);
  return { path: outputPath, mimetype: 'image/webp' };
};

const getMediaDuration = (filePath: string): Promise<number> =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        // Access the duration from the format section of the metadata
        const duration = metadata.format.duration;
        if (!duration) {
          reject(new Error('No duration found'));
        } else {
          resolve(duration);
        }
      }
    });
  });

interface VideoStreamInfo {
  width: number;
  height: number;
  duration: number;
}

const getVideoStreamInfo = (filePath: string): Promise<VideoStreamInfo> =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const stream = metadata.streams.find((s) => s.codec_type === 'video');
      const duration =
        metadata.format.duration ?? (stream?.duration ? Number(stream.duration) : undefined);
      if (!stream?.width || !stream?.height || !duration) {
        reject(new Error('Could not determine video stream info'));
        return;
      }
      resolve({ width: stream.width, height: stream.height, duration });
    });
  });

const createAudioPreview = async (inputPath: string): Promise<MediaFile> => {
  const outputPath = join(tmpdir(), `preview-${randomString(16)}.png`);
  try {
    const duration = await getMediaDuration(inputPath);
    const pixelsPerSecond = Math.floor(700 / duration);
    execSync(
      `audiowaveform -i ${inputPath} -o ${outputPath} \
        --background-color ffffff88 --waveform-color ${getTheme(await communityConfig()).primaryHex.slice(1)} \
        -w ${previewMaxWidth} -h ${previewMaxWidth} --pixels-per-second ${pixelsPerSecond} \
        --no-axis-labels -q`,
    );
    return { path: outputPath, mimetype: 'image/png' };
  } catch (error) {
    await fs.unlink(outputPath).catch(() => {});
    throw new Error(`Error generating audio preview: ${error}`);
  }
};

/**
 * Build a still 3x3 WebP montage of the video. Nine frames are sampled
 * evenly across the duration and tiled at the source aspect ratio so the
 * final image's dimensions mirror the video. We emit a single still frame
 * (not animated WebP) because RN/iOS' built-in image decoder doesn't render
 * animated WebP without an extra native dep.
 */
const createVideoPreview = async (inputPath: string): Promise<MediaFile> => {
  const tempOutputPath = join(tmpdir(), `preview-${randomString(16)}.webp`);

  const cleanup = async () => {
    fs.unlink(tempOutputPath).catch(log.error);
  };

  let info: VideoStreamInfo;
  try {
    info = await getVideoStreamInfo(inputPath);
  } catch (e) {
    await cleanup();
    throw e;
  }

  const gridCols = 3;
  const gridRows = 3;
  const frameCount = gridCols * gridRows;

  // Cell size derived from source aspect ratio; cap the total montage at
  // `previewMaxWidth` so we don't generate huge thumbnails for 4K video.
  // libwebp wants even dimensions for its yuv420 pipeline.
  const targetWidth = Math.min(info.width, previewMaxWidth);
  const cellWidth = Math.max(2, Math.floor(targetWidth / gridCols / 2) * 2);
  const cellHeight = Math.max(
    2,
    Math.floor((cellWidth * info.height) / info.width / 2) * 2,
  );

  // Sample 9 evenly spaced frames across the full duration via the fps
  // filter. setpts resets PTS so `tile` collects the frames in order.
  const sampleRate = frameCount / Math.max(info.duration, 0.001);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noAudio()
      .videoFilters([
        `fps=${sampleRate}`,
        `scale=${cellWidth}:${cellHeight}:force_original_aspect_ratio=decrease`,
        `pad=${cellWidth}:${cellHeight}:(ow-iw)/2:(oh-ih)/2:color=black`,
        `setpts=N/TB`,
        `tile=${gridCols}x${gridRows}`,
      ])
      .frames(1)
      .outputOptions(['-c:v libwebp', '-lossless 0', '-q:v 80'])
      .output(tempOutputPath)
      .on('end', async () => {
        try {
          const { size } = await fs.stat(tempOutputPath);
          if (!size) {
            throw new Error('Generated video preview is empty');
          }
          resolve({ path: tempOutputPath, mimetype: 'image/webp' });
        } catch (error: any) {
          await cleanup();
          reject(new Error(`Error handling output file: ${error.message}`));
        }
      })
      .on('error', async (error) => {
        await cleanup();
        reject(new Error(`FFmpeg error: ${error.message}`));
      })
      .run();
  });
};

export * from './processing';
export * from './jobs';
export * from './streaming';
export * from './streamingJobs';
export * from './streamingCleanupJobs';
export * from './streamingPrewarm';
