import { createHash } from 'node:crypto';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildReferenceScanSql,
  danglingMediaAttachmentIds,
  extractStorageIds,
  loadReferencedStorageIds,
  MEDIA_GC_GRACE_MS,
  REFERENCE_TABLES,
  classifyMediaFile,
  sweepUnreferencedMedia,
  type JsonbColumn,
  type SqlExecutor,
} from './garbageCollection';

const storageId = (label: string) =>
  createHash('sha256').update(label).digest('base64url');

const urlFor = (id: string, file = 'clip.mp4') =>
  `https://community.example/storage/allpeep/${id}/${file}`;

const exists = async (path: string) => {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
};

const contentColumns = (): JsonbColumn[] => [
  ...REFERENCE_TABLES.map((tableName) => ({ tableName, columnName: 'body' })),
  { tableName: 'media_attachments', columnName: 'body' },
  { tableName: 'entries', columnName: 'body' },
  { tableName: 'notifications', columnName: 'body' },
];

const deletedAtTables = new Set([
  'posts',
  'profiles',
  'groups',
  'configs',
  'notifications',
]);

describe('extractStorageIds', () => {
  const video = storageId('video');
  const preview = storageId('preview');
  const avatar = storageId('avatar');
  const stream = storageId('stream');

  it('reads ids from posts, pages, bios, fields, and streams', () => {
    const text = JSON.stringify({
      posts: {
        attachments: [
          { url: urlFor(video), previewUrl: urlFor(preview, 'thumb.webp') },
        ],
      },
      welcomePage: `![banner](${urlFor(avatar, 'banner.png')})`,
      bio: `photo ${urlFor(avatar, 'me.jpg')}`,
      fields: [{ value: urlFor(stream, 'ignored') }],
      stream: `https://community.example/media/streaming/${stream}/hls.m3u8`,
    });
    expect(extractStorageIds(text).sort()).toEqual(
      [video, preview, avatar, stream].sort(),
    );
  });

  it('ignores tokens that are not a content hash', () => {
    const id = storageId('exact');
    const text = [
      urlFor(id),
      `/allpeep/${id.slice(0, 42)}/short.mp4`,
      `/allpeep/${id}a/longer.mp4`,
    ].join('\n');
    expect(extractStorageIds(text)).toEqual([id]);
  });
});

describe('buildReferenceScanSql', () => {
  const sqlText = buildReferenceScanSql(contentColumns(), deletedAtTables);

  it('scans live posts and jam recordings, not the upload registry', () => {
    expect(sqlText).toBeTruthy();
    const branches = sqlText?.split('UNION ALL') ?? [];
    const posts = branches.find((branch) => branch.includes('"posts"'));
    const recordings = branches.find((branch) =>
      branch.includes('"jam_recordings"'),
    );
    expect(posts).toContain('"deleted_at" IS NULL');
    expect(recordings).toBeTruthy();
    expect(recordings).not.toContain('deleted_at');
    expect(sqlText).not.toContain('media_attachments');
    expect(sqlText).not.toContain('"entries"');
    expect(sqlText).toContain('"notifications"');
  });
});

describe('loadReferencedStorageIds', () => {
  const video = storageId('linked');

  const executor = (
    columns: { table_name: string; column_name: string }[],
  ): SqlExecutor & { queries: string[] } => {
    const queries: string[] = [];
    return {
      queries,
      execute: async (query: string) => {
        queries.push(query);
        if (query.includes('udt_name')) {
          return { rows: columns };
        }
        if (query.includes("column_name = 'deleted_at'")) {
          return {
            rows: [...deletedAtTables].map((table_name) => ({ table_name })),
          };
        }
        return { rows: [{ storage_id: video }, { storage_id: 'nope' }] };
      },
    };
  };

  it('returns live storage ids', async () => {
    const db = executor(
      contentColumns().map((column) => ({
        table_name: column.tableName,
        column_name: column.columnName,
      })),
    );
    await expect(loadReferencedStorageIds(db)).resolves.toEqual(
      new Set([video]),
    );
    const scan = db.queries[2] ?? '';
    expect(scan).not.toContain('media_attachments');
    expect(scan).not.toContain('"entries"');
    expect(scan).toContain('"jam_recordings"');
  });

  it('refuses to run when a content table is missing', async () => {
    const db = executor([
      { table_name: 'profiles', column_name: 'body' },
      { table_name: 'groups', column_name: 'body' },
      { table_name: 'configs', column_name: 'body' },
      { table_name: 'jam_recordings', column_name: 'body' },
    ]);
    await expect(loadReferencedStorageIds(db)).rejects.toThrow(/posts/);
    expect(db.queries).toHaveLength(1);
  });
});

describe('danglingMediaAttachmentIds', () => {
  const kept = storageId('kept');
  const gone = storageId('gone');
  const row = (id: string, body: string) => ({ id, body });

  it('drops rows whose local files are all gone', () => {
    expect(
      danglingMediaAttachmentIds(
        [
          row('a', JSON.stringify({ url: urlFor(gone) })),
          row(
            'b',
            JSON.stringify({
              url: urlFor(gone),
              previewUrl: urlFor(kept, 't.webp'),
            }),
          ),
          row('c', JSON.stringify({ url: 'https://remote.example/a.jpg' })),
        ],
        new Set([kept]),
      ),
    ).toEqual(['a']);
  });
});

describe('classifyMediaFile', () => {
  const now = Date.parse('2026-10-13T04:30:00.000Z');
  const id = storageId('classified');

  it('keeps a linked file even when an old clock is still recorded', () => {
    expect(
      classifyMediaFile(id, new Set([id]), now - MEDIA_GC_GRACE_MS, now),
    ).toEqual({
      status: 'referenced',
      unreferencedSince: null,
      deletesAt: null,
    });
  });

  it('waits out the grace period, then marks the file due', () => {
    const since = now - 60_000;
    expect(classifyMediaFile(id, new Set(), since, now).status).toBe('pending');
    expect(
      classifyMediaFile(id, new Set(), now - MEDIA_GC_GRACE_MS, now).status,
    ).toBe('due');
  });

  it('leaves a file unseen until garbage collection records it', () => {
    expect(classifyMediaFile(id, new Set(), undefined, now).status).toBe(
      'unseen',
    );
  });
});

describe('sweepUnreferencedMedia', () => {
  const now = Date.parse('2026-10-13T04:30:00.000Z');
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'media-gc-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const layout = () => ({
    filesDir: join(root, 'allpeep'),
    hlsRoot: join(root, 'hls'),
    statePath: join(root, 'gc-unreferenced.json'),
    now,
    graceMs: MEDIA_GC_GRACE_MS,
    // No Redis in the test environment — always report the stream as idle
    // so the sweep proceeds to delete HLS directories like it used to.
    streamActiveChecker: async () => false,
  });

  const writeStored = async (id: string, bytes = 'media') => {
    const path = join(root, 'allpeep', id);
    await mkdir(join(root, 'allpeep'), { recursive: true });
    await writeFile(path, bytes);
    return path;
  };

  it('marks a newly unreferenced file and deletes it after the grace period', async () => {
    const id = storageId('orphan');
    const path = await writeStored(id);
    const hls = join(root, 'hls', id);
    await mkdir(hls, { recursive: true });
    await writeFile(join(hls, 'hls.m3u8'), '#EXTM3U');

    const marked = await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
    });
    expect(marked.deleted).toEqual([]);
    expect(marked.marked).toBe(1);
    expect(await exists(path)).toBe(true);
    expect(await exists(hls)).toBe(true);

    const deleted = await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
      now: now + MEDIA_GC_GRACE_MS,
    });
    expect(deleted.deleted).toEqual([id]);
    expect(await exists(path)).toBe(false);
    expect(await exists(hls)).toBe(false);
    const state = JSON.parse(await readFile(layout().statePath, 'utf8'));
    expect(state[id]).toBeUndefined();
  });

  it('keeps a file that is still linked and clears its unreferenced clock', async () => {
    const id = storageId('linked');
    await writeStored(id);
    await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
    });
    const kept = await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set([id]),
      now: now + MEDIA_GC_GRACE_MS,
    });
    expect(kept.deleted).toEqual([]);
    expect(kept.kept).toBe(1);
    expect(await exists(join(root, 'allpeep', id))).toBe(true);
    const state = JSON.parse(await readFile(layout().statePath, 'utf8'));
    expect(state[id]).toBeUndefined();
  });

  it('does not restart the clock on later runs', async () => {
    const id = storageId('waiting');
    await writeStored(id);
    await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
    });
    await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
      now: now + 60_000,
    });
    const state = JSON.parse(await readFile(layout().statePath, 'utf8'));
    expect(state[id]).toBe(now);
  });

  it('deletes expired upload temps and leaves fresh ones', async () => {
    await mkdir(join(root, 'allpeep'), { recursive: true });
    const oldTemp = join(root, 'allpeep', '.tmp-old');
    const newTemp = join(root, 'allpeep', '.tmp-new');
    await writeFile(oldTemp, 'partial');
    await writeFile(newTemp, 'partial');
    const old = new Date(now - MEDIA_GC_GRACE_MS - 1000);
    await utimes(oldTemp, old, old);

    const result = await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
    });
    expect(result.tempDeleted).toBe(1);
    expect(await exists(oldTemp)).toBe(false);
    expect(await exists(newTemp)).toBe(true);
  });

  it('removes an HLS directory whose source file is already gone', async () => {
    const id = storageId('stream-only');
    const hls = join(root, 'hls', id);
    await mkdir(join(root, 'allpeep'), { recursive: true });
    await mkdir(hls, { recursive: true });
    await writeFile(join(hls, 'seg.ts'), 'x');

    await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
    });
    expect(await exists(hls)).toBe(false);
  });

  it('preserves HLS directories for streams that were accessed recently', async () => {
    const id = storageId('active-stream');
    const path = await writeStored(id);
    const hls = join(root, 'hls', id);
    await mkdir(hls, { recursive: true });
    await writeFile(join(hls, 'hls.m3u8'), '#EXTM3U');

    // First run: mark the file as unreferenced (no deletion yet).
    await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
    });
    expect(await exists(path)).toBe(true);
    expect(await exists(hls)).toBe(true);

    // Second run: past the grace period so the file is doomed.  Because the
    // stream is reported as recently active, the HLS cache is preserved.
    const deleted = await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
      now: now + MEDIA_GC_GRACE_MS,
      streamActiveChecker: async () => true,
    });
    expect(deleted.deleted).toEqual([id]);
    expect(await exists(path)).toBe(false);
    expect(await exists(hls)).toBe(true);
  });

  it('deletes HLS directories when the stream is idle', async () => {
    const id = storageId('idle-stream');
    const path = await writeStored(id);
    const hls = join(root, 'hls', id);
    await mkdir(hls, { recursive: true });
    await writeFile(join(hls, 'hls.m3u8'), '#EXTM3U');

    await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
    });
    const deleted = await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
      now: now + MEDIA_GC_GRACE_MS,
      streamActiveChecker: async () => false,
    });
    expect(deleted.deleted).toEqual([id]);
    expect(await exists(path)).toBe(false);
    expect(await exists(hls)).toBe(false);
  });

  it('skips unexpected files and a missing storage directory', async () => {
    await mkdir(join(root, 'allpeep'), { recursive: true });
    await writeFile(join(root, 'allpeep', 'readme.txt'), 'no');
    await symlink(
      join(root, 'allpeep', 'readme.txt'),
      join(root, 'allpeep', 'link'),
    );
    const result = await sweepUnreferencedMedia({
      ...layout(),
      referencedIds: new Set(),
    });
    expect(result.skipped.sort()).toEqual(['link', 'readme.txt']);
    expect(await exists(join(root, 'allpeep', 'readme.txt'))).toBe(true);

    const missing = await sweepUnreferencedMedia({
      ...layout(),
      filesDir: join(root, 'missing'),
      referencedIds: new Set(),
    });
    expect(missing.storageMissing).toBe(true);
    expect(missing.deleted).toEqual([]);
  });
});
