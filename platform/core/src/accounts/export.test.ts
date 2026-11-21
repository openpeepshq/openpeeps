import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWriteStream } from 'node:fs';
import { getTableName, type Table } from 'drizzle-orm';
import archiver from 'archiver';
import extract from 'extract-zip';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { PublicPost, PublicProfile } from '@openpeepshq/common/types';
import type { ExportMediaFile } from './export';

/** Wrap bytes in a web ReadableStream — what `MediaStorage.getStream` returns. */
const webStream = (bytes: Uint8Array): ReadableStream =>
  new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

const { fetchRowsByIds, hydrateMapData, transformPost, getProfiles } =
  vi.hoisted(() => ({
    fetchRowsByIds: vi.fn(),
    hydrateMapData: vi.fn(),
    transformPost: vi.fn(),
    getProfiles: vi.fn(),
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
  mediaStorage: vi.fn(),
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
import { mediaStorage } from '../media';
import {
  gatherAccountExport,
  buildAccountExportZip,
  type AccountExportBundle,
} from './export';

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
  // `parent` so the shared ancestor is walked twice and must de-dup.
  parent: '77777777-0000-4000-8000-000000000000',
  grandparent: '66666666-0000-4000-8000-000000000000',
};

const account = {
  id: IDS.account,
  email: 'me@example.com',
  emailValidated: true,
  profiles: [{ id: IDS.profile }],
} as unknown as Parameters<typeof gatherAccountExport>[0];

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

// Keep the fake db's scoping in sync with the mocked `getProfiles`: the export
// only sees posts/entry edges authored by the account's own profiles.
const control = (...ids: string[]) => {
  controlledProfileIds = ids;
};

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

// A fake db that resolves drizzle `select().from(table)` by table name,
// supports `execute` (the ancestor walk), and applies the `inArray` scoping
// the export uses: posts are filtered by `creatorId` and entry edges by
// `fromId`, both restricted to the profiles the account controls. This lets
// the tests verify "another account's data is absent" without a real DB.
let rowsByTable: Record<string, Record<string, unknown>[]> = {};
// Set together with the mocked `getProfiles` so the two stay in sync.
let controlledProfileIds: string[] = [];
// How many times the ancestor CTE ran for the most recent gather — the export
// must issue it once over all created replies, never once per reply.
let executeCalls = 0;
const fakeDb = {
  select: () => ({
    from: (table: unknown) => {
      const name = getTableName(table as Table);
      const result = Promise.resolve(rowsByTable[name] ?? []);
      const api: Record<string, unknown> = {
        where: () => {
          // Only the posts and entries queries carry a scoping predicate.
          const key =
            name === 'posts'
              ? 'creatorId'
              : name === 'entries'
                ? 'fromId'
                : null;
          const rows = key
            ? (rowsByTable[name] ?? []).filter((row) =>
                controlledProfileIds.includes(row[key] as string),
              )
            : (rowsByTable[name] ?? []);
          const scoped = Promise.resolve(rows);
          api.then = scoped.then.bind(scoped);
          api.catch = scoped.catch.bind(scoped);
          api.finally = scoped.finally.bind(scoped);
          // The fake re-binds `then`/`catch`/`finally` in place and returns
          // itself, so callers must use it as a terminal `.where()` step.
          // Freezing the object makes that contract explicit: a later chain
          // (`.orderBy().where()`) or a re-used builder cannot silently
          // mutate the already-bound promise semantics.
          Object.freeze(api);
          return api;
        },
        limit: () => api,
        orderBy: () => api,
        offset: () => api,
        $dynamic: () => api,
        then: result.then.bind(result),
        catch: result.catch.bind(result),
        finally: result.finally.bind(result),
      };
      return api;
    },
  }),
  // Emulate the `reply_to` ancestor CTE the export uses. `ancestorIdsOf`
  // binds every starting post id into the SQL template; the fake pulls them
  // out of the template's `queryChunks` (each interpolation lands as a plain
  // string chunk) and walks the `reply_to` rows (`from_id` = child reply,
  // `to_id` = its parent) from all starts at once. It mirrors the CTE's
  // exact contract — `SELECT DISTINCT node_id ... ORDER BY node_id`, no
  // `depth` in the projection — via the `seen` de-dup and the final
  // `localeCompare` sort (Postgres orders uuid `node_id` in byte order,
  // which is lexicographic for canonical uuid strings). The real
  // `.filter(!starting.has(id))` is what drops the starting posts.
  execute: (template: unknown) => {
    executeCalls++;
    const chunks = (template as { queryChunks?: unknown[] })?.queryChunks ?? [];
    // The starting ids are the only string leaves in the template; `sql.join`
    // nests each parameter one level deeper, so collect recursively.
    const collect = (cs: unknown[]): string[] =>
      cs.flatMap((c) => {
        if (typeof c === 'string') return [c];
        if (
          c &&
          typeof c === 'object' &&
          'queryChunks' in c &&
          Array.isArray((c as { queryChunks: unknown[] }).queryChunks)
        )
          return collect((c as { queryChunks: unknown[] }).queryChunks);
        return [];
      });
    const startIds = collect(chunks);
    if (startIds.length === 0) return Promise.resolve({ rows: [] });
    const parentOf = new Map<string, string>();
    for (const row of rowsByTable['reply_to'] ?? []) {
      const { from_id, to_id } = row as { from_id: string; to_id: string };
      parentOf.set(from_id, to_id);
    }
    // BFS from every starting post, capped at 64 levels like the CTE.
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
  fromId: string,
  toId: string,
  type: string,
  reaction: string,
  createdAt: string,
) => ({
  fromId,
  toId,
  createdAt,
  body: { type, data: { reaction } },
});

beforeEach(async () => {
  vi.resetModules();
  rowsByTable = {};
  controlledProfileIds = [];
  executeCalls = 0;
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
    async (_db: unknown, _col: string, ids: string[]) =>
      ids.map((id) => ({ id })),
  );
  hydrateMapData.mockImplementation(
    async (_db: unknown, _map: unknown, rows: { id: string }[]) =>
      rows.map((r) => r),
  );
});

describe('gatherAccountExport', () => {
  it('includes only the account-created posts and de-duplicates reactions', async () => {
    const created = [IDS.c1, IDS.c2];
    const reactedNet = IDS.r1;
    const reactedGone = IDS.c2; // created AND reacted to, then unreacted
    // The two posts are the account's own; a third post is created by a
    // different profile and must not appear (scoping to self).
    rowsByTable['posts'] = [
      { id: IDS.c1, creatorId: IDS.profile },
      { id: IDS.c2, creatorId: IDS.profile },
      { id: IDS.otherPost, creatorId: IDS.other },
    ];
    // reaction + later unreaction on c2 => net zero; lone reaction on r1.
    // The other profile's reaction on its own post is out of scope.
    rowsByTable['entries'] = [
      entry(IDS.profile, reactedNet, 'reaction', '👍', NOW),
      entry(IDS.profile, reactedGone, 'reaction', '👍', NOW),
      entry(
        IDS.profile,
        reactedGone,
        'unreaction',
        '👍',
        '2026-01-02T00:00:00.000Z',
      ),
      entry(IDS.other, IDS.otherTarget, 'reaction', '👍', NOW),
    ];
    getProfiles.mockResolvedValue([profile(IDS.profile)]);
    control(IDS.profile);

    const bundle = await gatherAccountExport(account);
    expect(bundle.createdPosts.map((f) => f.post.id)).toEqual(created);
    // Only the net reaction survives de-dup; the unreacted post is excluded.
    expect(bundle.reactedPosts.map((f) => f.post.id)).toEqual([reactedNet]);
    expect(bundle.skipped).toBe(0);
  });

  it('counts posts that fail public serialization as skipped', async () => {
    const created = [IDS.c1, IDS.c2];
    rowsByTable['posts'] = created.map((id) => ({
      id,
      creatorId: IDS.profile,
    }));
    rowsByTable['entries'] = [];
    getProfiles.mockResolvedValue([profile(IDS.profile)]);
    control(IDS.profile);
    // c2 cannot be serialized to a public post (schema drift simulation).
    transformPost.mockImplementation(async (dbPost: { id: string }) =>
      dbPost.id === created[1]
        ? ({ id: dbPost.id, type: 'post' } as unknown as PublicPost)
        : publicPost(dbPost.id),
    );

    const bundle = await gatherAccountExport(account);
    expect(bundle.createdPosts.map((f) => f.post.id)).toEqual([created[0]]);
    expect(bundle.skipped).toBe(1);
  });

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
    control(IDS.profile);

    const bundle = await gatherAccountExport(account);

    expect(bundle.createdPosts.map((f) => f.post.id).sort()).toEqual([
      IDS.c1,
      IDS.c2,
    ]);
    // The shared parent is walked once per created reply but must land
    // exactly once; the grandparent rides along from the parent's own row.
    expect(bundle.contextPosts.map((f) => f.post.id).sort()).toEqual([
      IDS.grandparent,
      IDS.parent,
    ]);
    // One CTE for every created reply, not one per reply.
    expect(executeCalls).toBe(1);
    // Context posts carry the context flag and the context dir in their path;
    // the two created replies are never misfiled as context.
    for (const file of bundle.contextPosts) {
      expect(file.contextOnly).toBe(true);
      expect(file.path).toBe(`posts/context/${file.post.id}.json`);
    }
    const contextIds = bundle.contextPosts.map((f) => f.post.id);
    for (const id of [IDS.c1, IDS.c2]) {
      expect(contextIds).not.toContain(id);
    }
  });

  it('collects profile avatar/header media into media/, deduped against posts referencing the same file', async () => {
    // The profile's avatar and header each land in the bundle's media list
    // (written to `media/` by the zip builder); the avatar, which a created
    // post also references, is collected once with both ids in `usedIn`.
    const avatarUrl = 'https://x/allpeep/av-42/pic.png';
    const headerUrl = 'https://x/allpeep/hd-7/banner.png';
    rowsByTable['posts'] = [{ id: IDS.c1, creatorId: IDS.profile }];
    rowsByTable['entries'] = [];
    getProfiles.mockResolvedValue([
      { ...profile(IDS.profile, avatarUrl), header: headerUrl } as never,
    ]);
    control(IDS.profile);
    transformPost.mockImplementation(async (dbPost: { id: string }) =>
      publicPost(dbPost.id, {
        attachments: [{ url: avatarUrl, filename: 'pic.png' }],
      }),
    );

    const bundle = await gatherAccountExport(account);

    expect(bundle.media).toHaveLength(2);
    const avatar = bundle.media.filter((m) => m.mediaAttachmentId === 'av-42');
    expect(avatar).toHaveLength(1);
    expect(avatar[0].path).toBe('media/av-42-pic.png');
    // The shared file is referenced by both the post and the profile.
    expect(avatar[0].usedIn).toEqual([IDS.c1, IDS.profile]);

    const header = bundle.media.find((m) => m.mediaAttachmentId === 'hd-7');
    expect(header?.path).toBe('media/hd-7-banner.png');
    expect(header?.usedIn).toEqual([IDS.profile]);
  });
});

describe('buildAccountExportZip', () => {
  const buildBundle = (
    opts: {
      skipped?: number;
      created?: string[];
      reacted?: string[];
      media?: Array<Partial<ExportMediaFile> & { path: string }>;
    } = {},
  ): AccountExportBundle => {
    const created = opts.created ?? [IDS.c1];
    const reacted = opts.reacted ?? [IDS.r1];
    const media =
      opts.media ??
      ([
        {
          mediaAttachmentId: 'att-1',
          path: 'media/att-1-photo.png',
          filename: 'photo.png',
          mimetype: 'image/png',
          size: 5,
          usedIn: [IDS.c1],
        },
      ] as Array<Partial<ExportMediaFile> & { path: string }>);
    return {
      account,
      profiles: [profile(IDS.profile, 'https://x/allpeep/av-1/pic.png')],
      createdPosts: created.map((id) => ({
        path: `posts/created/${id}.json`,
        post: publicPost(id, {
          attachments: [
            {
              url: `https://x/allpeep/att-${id.slice(-2)}/photo.png`,
              filename: 'photo.png',
            },
          ],
        }),
      })),
      contextPosts: [],
      reactedPosts: reacted.map((id) => ({
        path: `posts/reacted-to/${id}.json`,
        post: publicPost(id),
      })),
      media: media.map((m) => ({
        mediaAttachmentId: m.mediaAttachmentId ?? 'att-1',
        path: m.path,
        filename: m.filename ?? 'photo.png',
        mimetype: m.mimetype ?? 'image/png',
        size: m.size,
        usedIn: m.usedIn ?? [created[0]],
      })),
      skipped: opts.skipped ?? 0,
    };
  };

  it('writes the expected layout, a media manifest, and meta.json counts', async () => {
    vi.mocked(mediaStorage).mockResolvedValue({
      isLocal: () => true,
      getStream: async () => webStream(new Uint8Array([1, 2, 3, 4, 5])),
    } as never);

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'export-zip-'));
    const destDir = path.join(root, 'dest');
    const { manifest } = await buildAccountExportZip(
      buildBundle({ skipped: 0 }),
      destDir,
    );

    const extractDir = path.join(root, 'out');
    await extract(path.join(destDir, 'export.zip'), { dir: extractDir });
    const list = async (): Promise<string[]> => {
      const walk = async (dir: string): Promise<string[]> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const out: string[] = [];
        for (const e of entries) {
          const rel = path.join(dir, e.name).slice(extractDir.length + 1);
          if (e.isDirectory())
            out.push(...(await walk(path.join(dir, e.name))));
          else out.push(rel);
        }
        return out;
      };
      return walk(extractDir).then((files) => files.sort());
    };

    const files = await list();
    expect(files).toContain('account.json');
    expect(files).toContain(`profiles/${IDS.profile}.json`);
    expect(files).toContain(`posts/created/${IDS.c1}.json`);
    expect(files).toContain(`posts/reacted-to/${IDS.r1}.json`);
    expect(files).toContain('media/att-1-photo.png');
    expect(files).toContain('media/manifest.json');
    expect(files).toContain('meta.json');

    const meta = JSON.parse(
      await fs.readFile(path.join(extractDir, 'meta.json'), 'utf8'),
    ) as { counts: Record<string, number> };
    expect(meta.counts).toMatchObject({
      createdPosts: 1,
      contextPosts: 0,
      reactedPosts: 1,
      media: 1,
      mediaBytes: 5,
      skipped: 0,
      skippedMedia: 0,
    });
    expect(manifest.counts.skipped).toBe(0);
    expect(manifest.counts.skippedMedia).toBe(0);

    const mediaManifest = JSON.parse(
      await fs.readFile(path.join(extractDir, 'media/manifest.json'), 'utf8'),
    ) as Array<{ mediaAttachmentId: string; usedIn: string[] }>;
    expect(mediaManifest).toHaveLength(1);
    expect(mediaManifest[0].mediaAttachmentId).toBe('att-1');
    expect(mediaManifest[0].usedIn).toEqual([IDS.c1]);

    await fs.rm(root, { recursive: true, force: true });
    // real fs round-trip (mkdtemp → zip → extract → walk) can exceed
    // vitest's 5s default on slow CI disks
  }, 15_000);

  it('carries the skipped count into meta.json', async () => {
    vi.mocked(mediaStorage).mockResolvedValue({
      isLocal: () => true,
      getStream: async () => webStream(new Uint8Array([1])),
    } as never);
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'export-zip-'));
    const destDir = path.join(root, 'dest');
    await buildAccountExportZip(buildBundle({ skipped: 3 }), destDir);
    const extractDir = path.join(root, 'out');
    await extract(path.join(destDir, 'export.zip'), { dir: extractDir });
    const meta = JSON.parse(
      await fs.readFile(path.join(extractDir, 'meta.json'), 'utf8'),
    ) as { counts: { skipped: number } };
    expect(meta.counts.skipped).toBe(3);
    await fs.rm(root, { recursive: true, force: true });
  }, 15_000);

  it('bundles a moderate multi-post / multi-media export and skips unreadable media', async () => {
    // 3 created + 2 reacted posts, 3 media files, one of which cannot be read
    // from storage. The unreadable file is omitted (not counted) and the
    // manifest lists only the two that bundled successfully.
    vi.mocked(mediaStorage).mockResolvedValue({
      isLocal: () => true,
      getStream: (id: string) =>
        id === 'att-bad'
          ? Promise.reject(new Error('storage error'))
          : Promise.resolve(webStream(new Uint8Array(5))),
    } as never);

    const created = [
      '11111111-0000-4000-8000-0000000000c1',
      '22222222-0000-4000-8000-0000000000c2',
      '33333333-0000-4000-8000-0000000000c3',
    ];
    const reacted = [
      '44444444-0000-4000-8000-0000000000r1',
      '55555555-0000-4000-8000-0000000000r2',
    ];
    const media: Array<Partial<ExportMediaFile> & { path: string }> = [
      {
        mediaAttachmentId: 'att-a',
        path: 'media/att-a-photo.png',
        usedIn: [created[0]],
      },
      {
        mediaAttachmentId: 'att-bad',
        path: 'media/att-bad-photo.png',
        usedIn: [created[1]],
      },
      {
        mediaAttachmentId: 'att-c',
        path: 'media/att-c-photo.png',
        usedIn: [created[2], ...reacted],
      },
    ];

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'export-zip-'));
    const destDir = path.join(root, 'dest');
    const { manifest } = await buildAccountExportZip(
      buildBundle({ created, reacted, media, skipped: 0 }),
      destDir,
    );

    expect(manifest.counts.createdPosts).toBe(3);
    expect(manifest.counts.reactedPosts).toBe(2);
    // The unreadable media file is dropped, so 2 of 3 bundle — and the
    // manifest records the shrink (`skippedMedia`) instead of hiding it.
    expect(manifest.counts.media).toBe(2);
    expect(manifest.counts.mediaBytes).toBe(10);
    expect(manifest.counts.skippedMedia).toBe(1);

    const extractDir = path.join(root, 'out');
    await extract(path.join(destDir, 'export.zip'), { dir: extractDir });
    for (const id of created) {
      expect(
        await fs.access(path.join(extractDir, `posts/created/${id}.json`)).then(
          () => true,
          () => false,
        ),
      ).toBe(true);
    }
    for (const id of reacted) {
      expect(
        await fs
          .access(path.join(extractDir, `posts/reacted-to/${id}.json`))
          .then(
            () => true,
            () => false,
          ),
      ).toBe(true);
    }
    expect(
      await fs.access(path.join(extractDir, 'media/att-a-photo.png')).then(
        () => true,
        () => false,
      ),
    ).toBe(true);
    expect(
      await fs.access(path.join(extractDir, 'media/att-c-photo.png')).then(
        () => true,
        () => false,
      ),
    ).toBe(true);
    expect(
      await fs.access(path.join(extractDir, 'media/att-bad-photo.png')).then(
        () => true,
        () => false,
      ),
    ).toBe(false);

    const mediaManifest = JSON.parse(
      await fs.readFile(path.join(extractDir, 'media/manifest.json'), 'utf8'),
    ) as Array<{ mediaAttachmentId: string; usedIn: string[] }>;
    expect(mediaManifest.map((m) => m.mediaAttachmentId).sort()).toEqual([
      'att-a',
      'att-c',
    ]);
    const attC = mediaManifest.find((m) => m.mediaAttachmentId === 'att-c');
    expect(attC?.usedIn).toEqual([created[2], ...reacted]);

    await fs.rm(root, { recursive: true, force: true });
  }, 15_000);
});
