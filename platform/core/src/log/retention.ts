import { createReadStream, createWriteStream } from 'node:fs';
import { readdir, rm, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import archiver from 'archiver';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Daily log file as written by the logger, e.g. `20261001.log`. */
const RAW_LOG_FILE = /^\d{8}\.log$/;
/** Archive produced by `cleanOldLogs`, e.g. `20261001.log.zip`. */
const LOG_ZIP_FILE = /^\d{8}\.log\.zip$/;

export interface LogRetentionResult {
  /** Log files archived to a .zip during this run. */
  zipped: string[];
  /** Files (log and .zip) removed during this run. */
  deleted: string[];
  /** Log files under the zip threshold, or already zipped. */
  untouched: number;
}

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

const zipLogFile = (file: string, zipPath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') return;
      reject(err);
    });
    archive.pipe(output);
    archive.append(createReadStream(file), { name: basename(file) });
    void archive.finalize();
  });

export const cleanOldLogs = async (
  dir: string,
  zipAfterDays: number,
  deleteAfterDays: number,
): Promise<LogRetentionResult> => {
  const result: LogRetentionResult = { zipped: [], deleted: [], untouched: 0 };
  const now = Date.now();

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    // The log directory is created lazily by the logger; nothing to clean.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return result;
    throw err;
  }

  for (const entry of entries) {
    const isRawLog = RAW_LOG_FILE.test(entry);
    if (!isRawLog && !LOG_ZIP_FILE.test(entry)) continue;

    const filePath = join(dir, entry);
    // May already be gone: deleting a raw log also removes its zip.
    if (!(await fileExists(filePath))) continue;
    const st = await stat(filePath);
    if (!st.isFile()) continue;

    if (now - st.mtimeMs > deleteAfterDays * DAY_MS) {
      // Zips share the raw log's lifetime so disk usage actually shrinks.
      await rm(filePath, { force: true });
      result.deleted.push(entry);
      if (isRawLog) {
        const zipPath = `${filePath}.zip`;
        if (await fileExists(zipPath)) {
          await rm(zipPath, { force: true });
          result.deleted.push(`${entry}.zip`);
        }
      }
      continue;
    }

    if (!isRawLog) continue;
    if (
      now - st.mtimeMs > zipAfterDays * DAY_MS &&
      !(await fileExists(`${filePath}.zip`))
    ) {
      await zipLogFile(filePath, `${filePath}.zip`);
      result.zipped.push(entry);
    } else {
      result.untouched += 1;
    }
  }

  return result;
};
