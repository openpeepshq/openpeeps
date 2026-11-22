import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWriteStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { getTableName, type Table } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import archiver from 'archiver';
import { extractZipForTest } from '../testUtils/extractZip';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { PublicPost, PublicProfile } from '@openpeepshq/common/types';
import { EXPORT_PAGE_SIZE } from './export';

/** Wrap bytes in a web ReadableStream — what `MediaStorage.getStream` returns. */
const webStream = (bytes: Uint8Array): ReadableStream =>
  new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

const {
  fetchRowsByIds,
  hydrateMapData,
  transformPost,
  getProfiles,
  mediaStorage,
} = vi.hoisted(() => ({
  fetchRowsByIds: vi.fn(),
  hydrateMapData: vi.fn(),
  transformPost: vi.fn(),
  getProfiles: vi.fn(),
  mediaStorage: vi.fn(),
}));

vi.mock('../db', async (importOriginal) => ({
  // Re-export the cheap real constants so `backups` imports resolve.
  ...(await importOriginal<typeof import('../db')>()),
  allpeepDb: vi.fn(),
}));
vi.mock('../config', () => ({
  config: vi.fn(async () => ({})),
  communityConfig: vi.fn(async () => ({})),
  defaultConfig: {},
}));
vi.mock('../log', () => ({
  logger: () => ({
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  }),
}));
vi.mock('../profiles/cache', () => ({
  getProfiles,
}));
vi.mock('../media', () => ({
  mediaStorage,
}));
vi.mock('../posts/helpers', () => ({
  transformPost,
}));
vi.mock('../posts/mapping', () => ({
  postsAuthMapping: { data: () => ({ collection: 'posts' }) },
}));
vi.mock('../db/pg/map/relations', () => ({
  fetchRowsByIds,
  hydrateMapData,
}));
// Use a real archiver-backed zip so the layout test reads a genuine archive.
vi.mock('../backups', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../backups')>()),
  zipDirectory: (sourceDir: string, zipPath: string) =>
    new Promise<void>((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', () => resolve());
      output.on('error', reject);
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourceDir, false);
      void archive.finalize();
    }),
}));

import { allpeepDb } from '../db';
import { buildAccountExportZip } from './export';

const NOW = '2026-01-01T00:00:00.000Z';
const IDS = {
  profile: '11111111-2222-4333-8444-555555555555',
  other: 'bbbbbbbb-cccc-4ddd-8eee-ffffffff0000',
  account: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0000',
  c1: 'c1c1c1c1-0000-4000-8000-000000000000',
  c2: 'c2c2c2c2-0000-4000-8000-000000000000',
  r1: '11111111-0000-4000-8000-000000000001',
  otherPost: '99999999-0000-4000-8000-000000000000',
  otherTarget: '88888888-0000-4000-8000-000000000000',
  // A two-level thread the account authored the two bottom replies of:
  // parent -> grandparent (thread root), with c1 and c2 both replying to
  // `parent` so the shared ancestor is walked once and de-duped.
  parent: '77777777-0000-4000-8000-000000000000',
  grandparent: '66666666-0000-4000-8000-000000000000',
};

const account = {
  id: IDS.account,
  email: 'me@example.com',
  emailValidated: true,
  profiles: [{ id: IDS.profile }],
} as unknown as Parameters<typeof buildAccountExportZip>[0];

const profile = (id: string, avatar?: string): PublicProfile =>
  ({
    id,
    type: 'local',
    handle: 'me',
    displayName: 'Me',
    createdAt: NOW,
    updatedAt: NOW,
    ...(avatar ? { avatar } : {}),
  }) as unknown as PublicProfile;

const publicPost = (
  id: string,
  extra: Record<string, unknown> = {},
): PublicPost =>
  ({
    id,
    type: 'note',
    profile: profile(IDS.profile),
    data: { type: 'note', content: 'hello', ...extra },
    entries: [],
    createdAt: NOW,
    visibility: 'public',
    repostCount: 0,
    replyCount: 0,
    reactions: [],
    reposts: [],
    mentions: [],
    tags: [],
    updatedAt: NOW,
    rsvps: [],
  }) as unknown as PublicPost;

/** A schema-valid attachment (satisfies `mediaAttachmentDataSchema`). */
const attachment = (
  id: string,
  filename: string,
  mimetype: string,
): Record<string, unknown> => ({
  type: 'image',
  url: `https://x/allpeep/${id}/${filename}`,
  previewUrl: null,
  textUrl: null,
  filename,
  meta: { mimetype, size: 5 },
});

// A fake db that resolves drizzle `select().from(table).where(cond).orderBy()
// .limit(n)` by table name, renders the `cond` through drizzle's `PgDialect`
// (`sqlToQuery`) and applies the `inArray` scoping + keyset cursor the export
// uses: posts filtered by `creatorId` (and `id > cursor`), entries by
// `fromId` (and `id > cursor`). This lets the tests verify both "another
// account's data is absent" and the id-keyed pagination contract without a
// real DB. `execute` emulates the `reply_to` ancestor CTE (rejecting SQL the
// real driver would reject, then walking the `reply_to` rows).
let rowsByTable: Record<string, Record<string, unknown>[]> = {};
// How many times the ancestor CTE ran for the most recent build.
let executeCalls = 0;
// Every `softDelete` argument handed to `fetchRowsByIds` during the most
// recent build, in call order. The export must pass `false` for every hydrate
// so soft-deleted posts are included (GDPR: a complete record, not the live
// view).
const softDeleteArgs: unknown[] = [];
// The id count of every `fetchRowsByIds` call (one per hydrate page), so a
// test can pin the memory bound: no page may exceed `EXPORT_PAGE_SIZE`.
const hydratePageSizes: number[] = [];
// Renders the export's drizzle condition + SQL through PgDialect.
const pgDialect = new PgDialect();
const renderWhere = (
  cond: unknown,
): {
  inClauses: { col: string; values: string[] }[];
  gt: { col: string; value: string } | null;
} => {
  const { sql: s, params } = (
    pgDialect as {
      sqlToQuery: (t: never) => { sql: string; params: unknown[] };
    }
  ).sqlToQuery(cond as never);
  const inClauses: { col: string; values: string[] }[] = [];
  const inRe = /"([a-z_]+)" in \((\$[\d]+(?:\s*,\s*\$[\d]+)*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = inRe.exec(s))) {
    const values = m[2]
      .split(',')
      .map((tok) => String(params[parseInt(tok.replace(/\$/g, ''), 10) - 1]));
    inClauses.push({ col: m[1], values });
  }
  const gm = s.match(/"([a-z_]+)" > \$(\d+)/);
  const gt = gm
    ? { col: gm[1], value: String(params[parseInt(gm[2], 10) - 1]) }
    : null;
  return { inClauses, gt };
};
const filterRows = (
  name: string,
  cond: unknown,
  limit: number,
): Record<string, unknown>[] => {
  const all = rowsByTable[name] ?? [];
  if (!cond) return [...all].sort(byId).slice(0, limit);
  const w = renderWhere(cond);
  let rows: Record<string, unknown>[];
  if (name === 'posts') {
    const creatorIds =
      w.inClauses.find((c) => c.col === 'creator_id')?.values ?? [];
    rows = all.filter(
      (r) =>
        creatorIds.includes(r.creatorId as string) &&
        (!w.gt || (r.id as string) > w.gt.value),
    );
  } else if (name === 'entries') {
    const fromIds = w.inClauses.find((c) => c.col === 'from_id')?.values ?? [];
    rows = all.filter(
      (r) =>
        fromIds.includes(r.fromId as string) &&
        (!w.gt || (r.id as string) > w.gt.value),
    );
  } else {
    rows = all;
  }
  return [...rows].sort(byId).slice(0, limit);
};
const byId = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

const fakeDb = {
  select: () => ({
    from: (table: unknown) => {
      const name = getTableName(table as Table);
      const state: { cond: unknown; limit: number } = {
        cond: null,
        limit: Infinity,
      };
      const compute = () =>
        Promise.resolve(filterRows(name, state.cond, state.limit));
      const api: Record<string, unknown> = {
        where(c: unknown) {
          state.cond = c;
          return api;
        },
        orderBy: () => api,
        limit(n: number) {
          state.limit = n;
          return api;
        },
        $dynamic: () => api,
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
          compute().then(res, rej),
        catch: (rej: (e: unknown) => unknown) => compute().catch(rej),
        finally: (f: () => unknown) => compute().finally(f),
      };
      return api;
    },
  }),
  // Emulate the `reply_to` ancestor CTE the export uses. The fake renders the
  // template through drizzle's `PgDialect` (`sqlToQuery`) and pulls the
  // starting post ids out of the rendered parameter array, so it rejects SQL
  // the real driver would reject (e.g. `unnest($1$2$3)` split per id or a
  // non-text[] cast) instead of silently returning rows. It then walks the
  // `reply_to` rows (`from_id` = child reply, `to_id` = its parent) from all
  // starts at once, capped at 64 levels like the CTE.
  execute: (template: unknown) => {
    executeCalls++;
    const { sql: rendered, params } = (
      pgDialect as {
        sqlToQuery: (t: never) => { sql: string; params: unknown[] };
      }
    ).sqlToQuery(template as never);
    const startIds = params.flatMap((p) =>
      Array.isArray(p) ? p.map((v) => String(v)) : [],
    );
    // The rendered SQL must seed `unnest` from exactly one array parameter
    // cast to text[] — the only shape Postgres' `unnest()` accepts.
    if (
      !rendered.includes('::text[]') ||
      !/unnest\(\s*\$\d+\s*::text\[\]\s*\)/.test(rendered) ||
      params.length !== 1 ||
      !Array.isArray(params[0])
    ) {
      throw new Error(
        `ancestor CTE SQL does not render a single unnest($n::text[]) seed: ${rendered}`,
      );
    }
    if (startIds.length === 0) return Promise.resolve({ rows: [] });
    const parentOf = new Map<string, string>();
    for (const row of rowsByTable['reply_to'] ?? []) {
      const { from_id, to_id } = row as { from_id: string; to_id: string };
      parentOf.set(from_id, to_id);
    }
    const rows: { node_id: string }[] = [];
    const seen = new Set<string>(startIds);
    let frontier = [...startIds];
    for (let depth = 0; frontier.length > 0 && depth < 64; depth++) {
      const next: string[] = [];
      for (const node of frontier) {
        const parent = parentOf.get(node);
        if (!parent || seen.has(parent)) continue;
        seen.add(parent);
        rows.push({ node_id: parent });
        next.push(parent);
      }
      frontier = next;
    }
    rows.sort((a, b) => a.node_id.localeCompare(b.node_id));
    return Promise.resolve({ rows });
  },
};

const entry = (
  id: string,
  fromId: string,
  toId: string,
  type: string,
  reaction: string,
  createdAt: string,
) => ({ id, fromId, toId, createdAt, body: { type, data: { reaction } } });

/** Count the `.json` files under `dir` in the extracted zip. */
const countZipFiles = async (
  extractDir: string,
  rel: string,
): Promise<string[]> => {
  const dir = path.join(extractDir, rel);
  try {
    return (await fs.readdir(dir)).filter((n) => n.endsWith('.json'));
  } catch {
    return [];
  }
};

beforeEach(async () => {
  vi.resetModules();
  rowsByTable = {};
  executeCalls = 0;
  softDeleteArgs.length = 0;
  hydratePageSizes.length = 0;
  transformPost.mockReset();
  fetchRowsByIds.mockReset();
  hydrateMapData.mockReset();
  getProfiles.mockReset();
  vi.mocked(allpeepDb).mockResolvedValue({ db: fakeDb } as never);
  // Map requested ids -> their public post (transformPost is the real shape).
  transformPost.mockImplementation(async (dbPost: { id: string }) =>
    publicPost(dbPost.id),
  );
  fetchRowsByIds.mockImplementation(
    async (_db: unknown, _col: string, ids: string[], softDelete?: boolean) => {
      softDeleteArgs.push(softDelete);
      hydratePageSizes.push(ids.length);
      return ids.map((id) => ({ id }));
    },
  );
  hydrateMapData.mockImplementation(
    async (_db: unknown, _map: unknown, rows: { id: string }[]) =>
      rows.map((r) => r),
  );
});

describe('buildAccountExportZip', () => {
  const build = async (
    opts: {
      mediaStream?: (id: string) => Promise<ReadableStream> | ReadableStream;
    } = {},
  ) => {
    vi.mocked(mediaStorage).mockResolvedValue({
      isLocal: () => true,
      getStream:
        opts.mediaStream ??
        (async () => webStream(new Uint8Array([1, 2, 3, 4, 5]))),
    } as never);
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'export-zip-'));
    const destDir = path.join(root, 'dest');
    const { zipPath, manifest } = await buildAccountExportZip(account, destDir);
    const extractDir = path.join(root, 'out');
    await extractZipForTest(zipPath, extractDir);
    const cleanup = async () => fs.rm(root, { recursive: true, force: true });
    return { extractDir, manifest, cleanup };
  };

  it('includes only the account-created posts, de-duplicates reactions, and scopes out other accounts', async () => {
    const created = [IDS.c1, IDS.c2];
    const reactedNet = IDS.r1;
    const reactedGone = IDS.c2; // created AND reacted to, then unreacted
    // A third post is created by a different profile and must not appear
    // (scoping to self).
    rowsByTable['posts'] = [
      { id: IDS.c1, creatorId: IDS.profile },
      { id: IDS.c2, creatorId: IDS.profile },
      { id: IDS.otherPost, creatorId: IDS.other },
    ];
    // reaction + later unreaction on c2 => net zero; lone reaction on r1.
    // The other profile's reaction on its own post is out of scope.
    rowsByTable['entries'] = [
      entry('e1', IDS.profile, reactedNet, 'reaction', '👍', NOW),
      entry('e2', IDS.profile, reactedGone, 'reaction', '👍', NOW),
      entry(
        'e3',
        IDS.profile,
        reactedGone,
        'unreaction',
        '👍',
        '2026-01-02T00:00:00.000Z',
      ),
      entry('e4', IDS.other, IDS.otherTarget, 'reaction', '👍', NOW),
    ];
    getProfiles.mockResolvedValue([profile(IDS.profile)]);

    const { extractDir, manifest, cleanup } = await build();
    const createdFiles = await countZipFiles(extractDir, 'posts/created');
    expect(createdFiles.sort()).toEqual(
      created.map((id) => `${id}.json`).sort(),
    );
    // Only the net reaction survives de-dup; the unreacted post is excluded,
    // and the other account's target post never appears.
    const reactedFiles = await countZipFiles(extractDir, 'posts/reacted-to');
    expect(reactedFiles).toEqual([`${reactedNet}.json`]);
    expect(manifest.counts.createdPosts).toBe(2);
    expect(manifest.counts.reactedPosts).toBe(1);
    expect(manifest.counts.skipped).toBe(0);
    expect(manifest.profileIds).toEqual([IDS.profile]);
    await cleanup();
  }, 15_000);

  it('collects the reply_to ancestor chain: shared parent once, context-only, starting post dropped', async () => {
    // c1 and c2 are the account's replies to `parent`; `parent` replies to
    // `grandparent`. The account created none of the ancestors, so both must
    // surface as thread context (the CTE walk + `createdIdSet` exclusion).
    rowsByTable['posts'] = [
      { id: IDS.c1, creatorId: IDS.profile },
      { id: IDS.c2, creatorId: IDS.profile },
      { id: IDS.parent, creatorId: IDS.other },
      { id: IDS.grandparent, creatorId: IDS.other },
    ];
    rowsByTable['entries'] = [];
    rowsByTable['reply_to'] = [
      { from_id: IDS.c1, to_id: IDS.parent },
      { from_id: IDS.c2, to_id: IDS.parent },
      { from_id: IDS.parent, to_id: IDS.grandparent },
    ];
    getProfiles.mockResolvedValue([profile(IDS.profile)]);

    const { extractDir, manifest, cleanup } = await build();

    expect(manifest.counts.createdPosts).toBe(2);
    // The shared parent is walked once per created reply but must land
    // exactly once; the grandparent rides along from the parent's own row.
    const contextFiles = await countZipFiles(extractDir, 'posts/context');
    expect(contextFiles.sort()).toEqual(
      [`${IDS.grandparent}.json`, `${IDS.parent}.json`].sort(),
    );
    // One CTE for every created reply, not one per reply.
    expect(executeCalls).toBe(1);
    // The created replies are never misfiled as context.
    for (const id of [IDS.c1, IDS.c2]) {
      expect(contextFiles).not.toContain(`${id}.json`);
    }
    await cleanup();
  }, 15_000);

  it('hydrates posts with softDelete=false so soft-deleted posts are still exported', async () => {
    // The GDPR export is a complete record: even posts the account has since
    // soft-deleted must be included. That is guaranteed by `hydratePostsByIdsPaged`
    // passing `softDelete: false` to `fetchRowsByIds` (so the `deletedAt IS
    // NULL` filter is dropped) — pin that contract here so a regression that
    // re-filters soft-deleted posts fails the suite instead of passing silently.
    rowsByTable['posts'] = [
      { id: IDS.c1, creatorId: IDS.profile },
      { id: IDS.c2, creatorId: IDS.profile },
    ];
    rowsByTable['entries'] = [];
    getProfiles.mockResolvedValue([profile(IDS.profile)]);

    await build();

    // At least one hydrate ran (the created posts), and every hydrate asked
    // for the unfiltered (soft-deleted-included) read.
    expect(softDeleteArgs.length).toBeGreaterThan(0);
    expect(softDeleteArgs.every((a) => a === false)).toBe(true);
  }, 15_000);

  it('pages the created posts id-keyed so worker memory stays bounded', async () => {
    // 250 created posts (> 2 * EXPORT_PAGE_SIZE would be 2 pages; here 200 + 50)
    // must be walked in id-keyed pages of at most EXPORT_PAGE_SIZE, each
    // hydrated in a page no larger than EXPORT_PAGE_SIZE, and every created
    // post must still land in the zip (no data is dropped by the pagination).
    const count = 250;
    const ids = Array.from({ length: count }, () => randomUUID()).sort();
    rowsByTable['posts'] = ids.map((id) => ({ id, creatorId: IDS.profile }));
    rowsByTable['entries'] = [];
    getProfiles.mockResolvedValue([profile(IDS.profile)]);

    const { extractDir, manifest, cleanup } = await build();

    // Every created post survives the pagination.
    expect(manifest.counts.createdPosts).toBe(count);
    expect((await countZipFiles(extractDir, 'posts/created')).length).toBe(
      count,
    );

    // The id-hydrates were paged (200 + 50) and no page exceeded the bound.
    expect(hydratePageSizes.length).toBe(2);
    expect(hydratePageSizes.every((n) => n <= EXPORT_PAGE_SIZE)).toBe(true);
    expect(hydratePageSizes).toEqual([
      EXPORT_PAGE_SIZE,
      count - EXPORT_PAGE_SIZE,
    ]);
    // Every hydrate still asked for the soft-deleted-included read.
    expect(softDeleteArgs.every((a) => a === false)).toBe(true);
    await cleanup();
  }, 30_000);

  it('writes the expected layout, a media manifest, and meta.json counts', async () => {
    rowsByTable['posts'] = [{ id: IDS.c1, creatorId: IDS.profile }];
    rowsByTable['entries'] = [
      entry('e1', IDS.profile, IDS.r1, 'reaction', '👍', NOW),
    ];
    getProfiles.mockResolvedValue([
      {
        ...profile(IDS.profile, 'https://x/allpeep/av-1/pic.png'),
        header: 'https://x/allpeep/hd-1/banner.png',
      } as never,
    ]);
    transformPost.mockImplementation(async (dbPost: { id: string }) =>
      dbPost.id === IDS.c1
        ? publicPost(dbPost.id, {
            attachments: [attachment('att-1', 'photo.png', 'image/png')],
          })
        : publicPost(dbPost.id),
    );
    vi.mocked(mediaStorage).mockResolvedValue({
      isLocal: () => true,
      getStream: async () => webStream(new Uint8Array([1, 2, 3, 4, 5])),
    } as never);

    const { extractDir, manifest, cleanup } = await build();

    const files = await fs.readdir(extractDir);
    expect(files).toContain('account.json');
    expect(files).toContain('meta.json');
    expect(files).toContain('profiles');
    expect(files).toContain('posts');
    expect(files).toContain('media');
    // Every expected file exists (a missing file rejects the access).
    for (const rel of [
      `profiles/${IDS.profile}.json`,
      `posts/created/${IDS.c1}.json`,
      `posts/reacted-to/${IDS.r1}.json`,
      'media/att-1-photo.png',
      'media/av-1-pic.png',
      'media/hd-1-banner.png',
      'media/manifest.json',
    ]) {
      await expect(
        fs.access(path.join(extractDir, rel)),
      ).resolves.toBeUndefined();
    }

    const meta = JSON.parse(
      await fs.readFile(path.join(extractDir, 'meta.json'), 'utf8'),
    ) as { counts: Record<string, number> };
    expect(meta.counts).toMatchObject({
      createdPosts: 1,
      contextPosts: 0,
      reactedPosts: 1,
      media: 3,
      mediaBytes: 15,
      skipped: 0,
      skippedMedia: 0,
    });
    expect(manifest.counts.media).toBe(3);

    const mediaManifest = JSON.parse(
      await fs.readFile(path.join(extractDir, 'media/manifest.json'), 'utf8'),
    ) as Array<{ mediaAttachmentId: string; usedIn: string[] }>;
    expect(mediaManifest).toHaveLength(3);
    const avatar = mediaManifest.find((m) => m.mediaAttachmentId === 'av-1');
    // The avatar is referenced by the profile; the post media by the post.
    expect(avatar?.usedIn).toEqual([IDS.profile]);
    const photo = mediaManifest.find((m) => m.mediaAttachmentId === 'att-1');
    expect(photo?.usedIn).toEqual([IDS.c1]);

    await cleanup();
  }, 15_000);

  it('reveals the shrink: skips unserializable posts and unreadable media', async () => {
    // c1 -> good media (att-a); c2 -> unreadable media (att-bad); c3 -> a post
    // that cannot be serialized to a public post (dropped, counted `skipped`).
    const c3 = 'c3c3c3c3-0000-4000-8000-000000000000';
    rowsByTable['posts'] = [
      { id: IDS.c1, creatorId: IDS.profile },
      { id: IDS.c2, creatorId: IDS.profile },
      { id: c3, creatorId: IDS.profile },
    ];
    rowsByTable['entries'] = [];
    getProfiles.mockResolvedValue([profile(IDS.profile)]);
    transformPost.mockImplementation(async (dbPost: { id: string }) => {
      if (dbPost.id === c3) {
        return { id: dbPost.id, type: 'post' } as unknown as PublicPost;
      }
      const attId = dbPost.id === IDS.c1 ? 'att-1' : 'att-2';
      return publicPost(dbPost.id, {
        attachments: [attachment(attId, 'photo.png', 'image/png')],
      });
    });

    const { extractDir, manifest, cleanup } = await build({
      mediaStream: (id: string) =>
        id === 'att-2'
          ? Promise.reject(new Error('storage error'))
          : webStream(new Uint8Array(5)),
    });

    // c3 is dropped (unserializable); c1 + c2 are written.
    expect(manifest.counts.createdPosts).toBe(2);
    expect(manifest.counts.skipped).toBe(1);
    const createdFiles = await countZipFiles(extractDir, 'posts/created');
    expect(createdFiles).not.toContain(`${c3}.json`);
    expect(createdFiles).toContain(`${IDS.c1}.json`);
    expect(createdFiles).toContain(`${IDS.c2}.json`);

    // att-1 (c1's) bundled; att-2 (c2's, unreadable) omitted and revealed by
    // skippedMedia.
    expect(manifest.counts.media).toBe(1);
    expect(manifest.counts.skippedMedia).toBe(1);
    const mediaManifest = JSON.parse(
      await fs.readFile(path.join(extractDir, 'media/manifest.json'), 'utf8'),
    ) as Array<{ mediaAttachmentId: string }>;
    expect(mediaManifest.map((m) => m.mediaAttachmentId)).toEqual(['att-1']);
    expect(
      await fs.access(path.join(extractDir, 'media/att-2-photo.png')).then(
        () => true,
        () => false,
      ),
    ).toBe(false);

    await cleanup();
  }, 15_000);

  it('exports a soft-deleted created post (complete record, not the live view)', async () => {
    // A created post the account deleted (present in the keyset walk because
    // the id walk applies no `deletedAt` filter, and hydrated with
    // `softDelete: false`) must still land in the zip.
    rowsByTable['posts'] = [{ id: IDS.c1, creatorId: IDS.profile }];
    rowsByTable['entries'] = [];
    getProfiles.mockResolvedValue([profile(IDS.profile)]);

    const { extractDir, manifest, cleanup } = await build();

    expect(manifest.counts.createdPosts).toBe(1);
    expect(
      await fs
        .access(path.join(extractDir, `posts/created/${IDS.c1}.json`))
        .then(
          () => true,
          () => false,
        ),
    ).toBe(true);
    await cleanup();
  }, 15_000);
});
