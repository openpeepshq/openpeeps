import { spawn } from 'node:child_process';

/**
 * Minimal ffmpeg / ffprobe boundary for the media pipeline.
 *
 * Replaces fluent-ffmpeg (unmaintained; 2.1.3 is its final release) with a
 * thin spawn wrapper around the ~9 calls the media pipeline makes. Each call
 * site owns its explicit ffmpeg argv, which also removes fluent-ffmpeg's
 * space-splitting heuristic (the old HLS code had to split `-var_stream_map`
 * into a separate two-arg call to work around it) and its one-space-per-line
 * `stderr` rings, which truncated multi-line ffmpeg diagnostics.
 *
 * Binary resolution: `ffmpeg` / `ffprobe` are looked up on `PATH` (the
 * production image ships `ffmpeg` via apk). `FFMPEG_PATH` / `FFPROBE_PATH`
 * override the binary, mirroring fluent-ffmpeg's environment contract so
 * deployments that relocated the binaries keep working.
 */

const FFMPEG_BIN = () => process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_BIN = () => process.env.FFPROBE_PATH || 'ffprobe';

/** Last ~40 lines of stderr, the diagnostic tail ffmpeg diagnostics live in. */
const stderrTail = (stderr: string): string =>
  stderr.trim().split(/\r?\n/).slice(-40).join('\n');

interface RunResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

/** Runs a binary with fixed args and resolves with the exit info. */
const runProcess = (bin: string, args: string[]): Promise<RunResult> =>
  new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code, signal) =>
      resolve({ code, signal, stdout, stderr }),
    );
  });

/**
 * Spawns `ffmpeg -y -i <input> <...outputArgs> <outputPath>`.
 *
 * Resolves on exit code 0 (an ffmpeg non-zero exit is a conversion failure,
 * rejected with the stderr tail attached — that is where ffmpeg's actual
 * diagnostic lives, not the bare exit code). Also rejects when the binary
 * itself cannot be started (ENOENT etc.).
 */
export const runFfmpeg = async (
  inputPath: string,
  outputPath: string,
  outputArgs: string[],
): Promise<void> => {
  const { code, signal, stderr } = await runProcess(FFMPEG_BIN(), [
    '-y',
    '-i',
    inputPath,
    ...outputArgs,
    outputPath,
  ]);
  if (code === 0) return;
  const reason = signal
    ? `ffmpeg killed with signal ${signal}`
    : `ffmpeg exited with code ${code}`;
  const detail = stderrTail(stderr);
  throw new Error(
    detail ? `${reason}\n--- ffmpeg stderr (tail) ---\n${detail}` : reason,
  );
};

/** The ffprobe JSON fields the media pipeline reads. */
export interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: number | string;
  bit_rate?: string | number;
}

export interface FfprobeMetadata {
  format: {
    duration?: number;
    bit_rate?: string | number;
    format_name?: string;
  };
  streams: FfprobeStream[];
}

/**
 * Spawns `ffprobe -v quiet -print_format json -show_format -show_streams
 * <input>` and resolves with the parsed JSON (the shape fluent-ffmpeg's
 * `ffmpeg.ffprobe` delivered: `format.duration`, `streams[].width/height/
 * codec_type/bit_rate`, …). Rejects with the stderr tail on a non-zero exit
 * or unparseable output.
 */
export const ffprobe = async (inputPath: string): Promise<FfprobeMetadata> => {
  const { code, signal, stdout, stderr } = await runProcess(FFPROBE_BIN(), [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    inputPath,
  ]);
  if (code !== 0) {
    const reason = signal
      ? `ffprobe killed with signal ${signal}`
      : `ffprobe exited with code ${code}`;
    const detail = stderrTail(stderr);
    throw new Error(
      detail ? `${reason}\n--- ffprobe stderr (tail) ---\n${detail}` : reason,
    );
  }
  try {
    return JSON.parse(stdout) as FfprobeMetadata;
  } catch {
    throw new Error('ffprobe produced no parseable JSON output');
  }
};
