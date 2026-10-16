import { existsSync } from 'node:fs';
import { mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import extract from 'extract-zip';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanOldLogs } from './retention';

const DAY_MS = 24 * 60 * 60 * 1000;

let dir: string;
const tmpDirs: string[] = [];

const makeTmpDir = async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'openpeeps-log-retention-'));
  tmpDirs.push(tmpDir);
  return tmpDir;
};

const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

const makeLogFile = async (name: string, ageDays: number) => {
  const filePath = join(dir, name);
  await writeFile(filePath, `{"level":"info","message":"${name}"}\n`);
  const t = daysAgo(ageDays);
  await utimes(filePath, t, t);
  return filePath;
};

beforeEach(async () => {
  dir = await makeTmpDir();
});

afterAll(async () => {
  await Promise.all(
    tmpDirs.map((p) => rm(p, { recursive: true, force: true })),
  );
});

describe('cleanOldLogs', () => {
  it('zips raw logs older than zipAfterDays and keeps the original', async () => {
    const filePath = await makeLogFile('20260901.log', 8);
    const result = await cleanOldLogs(dir, 7, 30);

    expect(result.zipped).toEqual(['20260901.log']);
    expect(result.deleted).toEqual([]);
    await stat(filePath);
    const zipPath = `${filePath}.zip`;
    await stat(zipPath);

    const extractDir = await makeTmpDir();
    await extract(zipPath, { dir: extractDir });
    await stat(join(extractDir, '20260901.log'));
  });

  it('does not re-zip a log that already has an archive', async () => {
    await makeLogFile('20260901.log', 8);
    const first = await cleanOldLogs(dir, 7, 30);
    const second = await cleanOldLogs(dir, 7, 30);

    expect(first.zipped).toEqual(['20260901.log']);
    expect(second.zipped).toEqual([]);
    expect(second.untouched).toBe(1);
  });

  it('does not zip logs younger than zipAfterDays', async () => {
    await makeLogFile('20260925.log', 6);
    const result = await cleanOldLogs(dir, 7, 30);

    expect(result.zipped).toEqual([]);
    expect(result.untouched).toBe(1);
  });

  it('deletes logs and their archives once deleteAfterDays passes', async () => {
    const filePath = await makeLogFile('20260801.log', 40);
    // First run with a delete threshold above the file age: zip only.
    const first = await cleanOldLogs(dir, 7, 60);
    expect(first.zipped).toEqual(['20260801.log']);
    expect(first.deleted).toEqual([]);

    const second = await cleanOldLogs(dir, 7, 30);
    expect(second.zipped).toEqual([]);
    expect(second.deleted.sort()).toEqual(['20260801.log', '20260801.log.zip']);

    expect(existsSync(filePath)).toBe(false);
    expect(existsSync(`${filePath}.zip`)).toBe(false);
  });

  it('deletes orphan archives older than deleteAfterDays', async () => {
    const zipPath = join(dir, '20260801.log.zip');
    await writeFile(zipPath, 'zip-data');
    const t = daysAgo(40);
    await utimes(zipPath, t, t);

    const result = await cleanOldLogs(dir, 7, 30);

    expect(result.deleted).toEqual(['20260801.log.zip']);
  });

  it('leaves recent logs and unrelated files alone', async () => {
    const recent = await makeLogFile('20261001.log', 1);
    const notes = join(dir, 'notes.txt');
    await writeFile(notes, 'not a log');

    const result = await cleanOldLogs(dir, 7, 30);

    expect(result).toEqual({ zipped: [], deleted: [], untouched: 1 });
    await stat(recent);
    await stat(notes);
  });

  it('returns an empty result when the log directory does not exist', async () => {
    const result = await cleanOldLogs(join(dir, 'nope'), 7, 30);

    expect(result).toEqual({ zipped: [], deleted: [], untouched: 0 });
  });
});
