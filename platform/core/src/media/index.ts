import type { MediaStorage } from '@openpeeps/common/types';
import { communityConfig, config } from '../config';

import openpeepsStorage from './openpeeps';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import path, { join } from 'node:path';
import { tmpdir } from 'node:os';
import fs from 'node:fs/promises';
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

const transcodeVideo = async (input: File): Promise<Buffer> => {
  const arrayBuffer = await input.arrayBuffer();
  const isLargeFile = arrayBuffer.byteLength > 10 * 1024 * 1024;
  const tempInputPath = join(
    tmpdir(),
    `input-${randomString(16)}-${input.name}`,
  );
  const tempOutputPath = join(tmpdir(), `output-${randomString(16)}.mp4`);

  await fs.writeFile(tempInputPath, Buffer.from(arrayBuffer));

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
    // baseOutput.push('-vf scale=-1:540'); // Scale video to 540p height
    baseOutput.push('-max_muxing_queue_size 9999'); // Helps with complex MOV files
  } else {
    // baseOutput.push('-vf scale=-1:720'); // Scale video to 720p height
  }
  return new Promise((resolve, reject) => {
    ffmpeg(tempInputPath)
      .size(`${previewMaxWidth}x?`)
      .output(tempOutputPath)
      .outputOptions(baseOutput)
      .on('end', () => {
        fs.readFile(tempOutputPath).then(resolve).catch(reject);
      })
      .on('error', reject)
      .run();
  });
};

export const transcodeIncomingMedia = async (
  type: string,
  input: File,
): Promise<File> => {
  if (type === 'video') {
    return new File(
      [(await transcodeVideo(input)) as Buffer<ArrayBuffer>],
      path.parse(input.name).name + '.mp4',
      { type: 'video/mp4' },
    );
  }
  return input;
};

export const createPreview = async (input: File): Promise<Blob> => {
  switch (input.type.split('/')[0]) {
    case 'image':
      return createImagePreview(input);
    case 'audio':
      return createAudioPreview(input);
    case 'video':
      return createVideoPreview(input);
    default:
      if (input.name.endsWith('.mkv')) {
        return createVideoPreview(input);
      }
      return input;
  }
};

const createImagePreview = async (input: File | Blob) => {
  const inputImage = await input.arrayBuffer().then(sharp);

  if (
    (await inputImage.metadata().then((m) => m.width || 0)) <= previewMaxWidth
  ) {
    return input;
  } else {
    return new Blob(
      [await inputImage.rotate().resize(previewMaxWidth).webp().toBuffer() as Buffer<ArrayBuffer>],
      {
        type: 'image/webp',
      },
    );
  }
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

const createAudioPreview = async (input: File): Promise<Blob> => {
  const arrayBuffer = await input.arrayBuffer();

  return new Promise((resolve, reject) => {
    const extension = input.name.split('.').slice(-1)[0];
    const tempInputPath = join(
      tmpdir(),
      `input-${randomString(16)}.${extension}`,
    );
    const tempOutputPath = join(tmpdir(), `preview-${randomString(16)}.png`);

    const cleanup = async () => {
      fs.unlink(tempInputPath).catch(log.error);
      fs.unlink(tempOutputPath).catch(log.error);
    };
    fs.writeFile(tempInputPath, Buffer.from(arrayBuffer)).then(async () => {
      try {
        const duration = await getMediaDuration(tempInputPath);
        const pixelsPerSecond = Math.floor(700 / duration);
        execSync(
          `audiowaveform -i ${tempInputPath} -o ${tempOutputPath} \
        --background-color ffffff88 --waveform-color ${getTheme(await communityConfig()).primaryHex.slice(1)} \
        -w ${previewMaxWidth} -h ${previewMaxWidth} --pixels-per-second ${pixelsPerSecond} \
        --no-axis-labels -q`,
        );
        const buffer = await fs.readFile(tempOutputPath);
        resolve(createImagePreview(new Blob([buffer as Buffer<ArrayBuffer>], { type: 'image/png' })));
      } catch (error) {
        reject(new Error(`Error generating audio preview: ${error}`));
      } finally {
        await cleanup();
      }
    });
  });
};

/**
 * Build a still 3x3 WebP montage of the video. Nine frames are sampled
 * evenly across the duration and tiled at the source aspect ratio so the
 * final image's dimensions mirror the video. We emit a single still frame
 * (not animated WebP) because RN/iOS' built-in image decoder doesn't render
 * animated WebP without an extra native dep.
 */
const createVideoPreview = async (input: File): Promise<Blob> => {
  const arrayBuffer = await input.arrayBuffer();

  const extension = input.type.split('/')[1];
  const tempInputPath = join(
    tmpdir(),
    `input-${randomString(16)}.${extension}`,
  );
  const tempOutputPath = join(tmpdir(), `preview-${randomString(16)}.webp`);

  const cleanup = async () => {
    fs.unlink(tempInputPath).catch(log.error);
    fs.unlink(tempOutputPath).catch(log.error);
  };

  await fs.writeFile(tempInputPath, Buffer.from(arrayBuffer));

  let info: VideoStreamInfo;
  try {
    info = await getVideoStreamInfo(tempInputPath);
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
    ffmpeg(tempInputPath)
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
          const buffer = await fs.readFile(tempOutputPath);
          await cleanup();
          if (!buffer.length) {
            throw new Error('Generated video preview is empty');
          }
          resolve(new Blob([buffer as Buffer<ArrayBuffer>], { type: 'image/webp' }));
        } catch (error: any) {
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
