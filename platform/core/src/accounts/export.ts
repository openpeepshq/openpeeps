import path from 'node:path';
import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { and, asc, gt, inArray, sql } from 'drizzle-orm';
import { entries as entriesEdge, posts as postsTable } from '../db/pg/schema';
import { logger } from '../log';
import { allpeepDb } from '../db';
import type { PgDb } from '../db';
import {
  AccountWithMeta,
  DbPost,
  MediaAttachment,
  PostWithMeta,
  Profile,
  publicAccountSchema,
  publicPostSchema,
  publicProfileSchema,
} from '@openpeepshq/common/types';
import { currentReactionsFromEntries } from '@openpeepshq/common/lib';
import { getProfiles } from '../profiles/cache';
import { postsAuthMapping } from '../posts/mapping';
import { transformPost } from '../posts/helpers';
import { fetchRowsByIds, hydrateMapData } from '../db/pg/map/relations';
import { mediaStorage } from '../media';
import { zipDirectory } from '../backups';

const log = logger('app:accounts:export');

/**
 * A binary media file that will be written to the zip.
 */
export interface ExportMediaFile {
  mediaAttachmentId?: string;
  /** Zip-relative path, e.g. `media/<id>-<filename>`. */
  path: string;
  filename: string;
  mimetype?: string;
  size?: number;
  /** Post/profile ids that reference this file. */
  usedIn: string[];
}

export interface AccountExportManifest {
  exportedAt: string;
  accountId: string;
  profileIds: string[];
  counts: {
    createdPosts: number;
    contextPosts: number;
    reactedPosts: number;
    media: number;
    mediaBytes: number;
    /** Posts omitted because they could not be serialized to a public post. */
    skipped: number;
    /** Media omitted because the file could not be read from storage. */
    skippedMedia: number;
  };
}

/**
 * Memory bound of the export assembly: every unbounded read (the account's
 * created posts, the reaction/unreaction entry history, the id-hydrates and
 * the ancestor-CTE seeds) is paged in chunks of at most this many rows, and
 * every media file is streamed straight to the staging directory, so the
 * worker holds at most one page of the account's data at once — memory stays
 * flat for a very large account. The async job exists precisely because
 * exports are unbounded (issue #237: "Media cap: no -> async job"); the bound
 * is on how much the worker holds at once, not on what the export contains
 * (there is deliberately no cap or truncation — a very large export is
 * complete).
 */
export const EXPORT_PAGE_SIZE = 200;

/**
 * Read a set of posts by id, hydrating relations and transforming to their
 * public shape (so other users' private data — e.g. emails — is never
 * included). Soft-deleted rows are included (`fetchRowsByIds` only filters
 * `deletedAt IS NULL` when its `softDelete` argument is not exactly `false`)
 * so the export is a complete record of what the account authored or
 * interacted with: a post the account deleted is still that account's data
 * to receive back.
 *
 * Bounded: the ids are read + hydrated in pages of at most `EXPORT_PAGE_SIZE`
 * (one `fetchRowsByIds`/`hydrateMapData` pair per page), so a very large id
 * set is never fetched or hydrated in one pass. When `onPage` is given, each
 * page is handed to it (and then dropped) as soon as it is hydrated, so the
 * caller streams its work per page and never holds the whole id set's posts
 * at once. Returns the number of posts hydrated across all pages.
 */
const hydratePostsByIdsPaged = async (
  ids: string[],
  onPage?: (posts: PostWithMeta[]) => Promise<void>,
): Promise<number> => {
  if (ids.length === 0) return 0;
  const { db } = await allpeepDb();
  const mapData = postsAuthMapping.data();
  let hydrated = 0;
  for (let i = 0; i < ids.length; i += EXPORT_PAGE_SIZE) {
    const rows = await fetchRowsByIds(
      db,
      mapData.collection,
      ids.slice(i, i + EXPORT_PAGE_SIZE),
      false,
    );
    const posts = (await Promise.all(
      ((await hydrateMapData(db, mapData, rows)) as unknown as DbPost[]).map(
        (post) => transformPost(post, undefined, { embedThreadPreview: false }),
      ),
    )) as PostWithMeta[];
    hydrated += posts.length;
    if (onPage) await onPage(posts);
  }
  return hydrated;
};

/**
 * Walk the `reply_to` chains above the given posts (post -> parent ->
 * grandparent ... up to each thread root) in recursive-CTE queries and return
 * every ancestor post id. Capped to guard against pathological chains.
 *
 * This mirrors the canonical `reply_to` walk in `posts/activity.ts`
 * (`findReplyRootId`) — same edge direction (`from_id` = child, `to_id` =
 * parent), same `depth < 64` cap — generalized to many starting posts at once.
 * Keep the two in sync if the cap or the edge semantics ever change.
 *
 * Bounded: the start ids seed the CTE in pages (one `execute` per page of at
 * most `EXPORT_PAGE_SIZE` ids, ancestors de-duplicated across pages), so a
 * pathological account with thousands of replies does not render one
 * multi-thousand-element `unnest` parameter.
 */
const ancestorIdsOf = async (
  db: PgDb,
  postIds: string[],
): Promise<string[]> => {
  if (postIds.length === 0) return [];
  const seen = new Set<string>();
  for (let i = 0; i < postIds.length; i += EXPORT_PAGE_SIZE) {
    const page = postIds.slice(i, i + EXPORT_PAGE_SIZE);
    const result = (await db.execute(
      sql`
        WITH RECURSIVE walk AS (
          SELECT id AS node_id, 0 AS depth
          FROM (SELECT unnest(${sql.param(page)}::text[]))
            AS ids (id)
          UNION ALL
          SELECT rt.to_id, walk.depth + 1
          FROM reply_to rt
          INNER JOIN walk ON rt.from_id = walk.node_id
          WHERE walk.depth < 64
        )
        SELECT DISTINCT node_id
        FROM walk
        ORDER BY node_id
      `,
    )) as unknown as { rows: { node_id: string }[] };
    for (const row of result.rows) {
      seen.add(row.node_id);
    }
  }
  // Drop the starting posts themselves; only their ancestors are context.
  const starting = new Set(postIds);
  return [...seen].filter((id) => !starting.has(id));
};

/**
 * Return the ids of posts that one of the given profiles currently has a net
 * (not retracted) reaction on. Reactions and unactions are de-duplicated
 * exactly the way the UI computes current reactions (latest wins per
 * (profile, emoji); only `reaction` entries survive).
 *
 * Bounded: the reaction/unreaction entry history is read in id-keyed keyset
 * pages (at most `EXPORT_PAGE_SIZE` per read), retaining only the current
 * per-post reaction set — never the whole entry history.
 */
const reactedPostIdsOf = async (
  db: PgDb,
  profileIds: string[],
): Promise<string[]> => {
  if (profileIds.length === 0) return [];
  const byPost = new Map<
    string,
    {
      type: 'reaction' | 'unreaction';
      data: { reaction: string };
      profile: { id: string };
      createdAt: string;
    }[]
  >();
  let lastId: string | null = null;
  for (;;) {
    const conditions = [
      inArray(entriesEdge.fromId, profileIds),
      sql`body->>'type' in ('reaction', 'unreaction')`,
    ];
    if (lastId) conditions.push(gt(entriesEdge.id, lastId));
    const rows = (await db
      .select({
        id: entriesEdge.id,
        fromId: entriesEdge.fromId,
        toId: entriesEdge.toId,
        body: entriesEdge.body,
        createdAt: entriesEdge.createdAt,
      })
      .from(entriesEdge)
      .where(and(...conditions))
      .orderBy(asc(entriesEdge.id))
      .limit(EXPORT_PAGE_SIZE)) as unknown as {
      id: string;
      fromId: string;
      toId: string;
      createdAt: string;
      body: { type?: string; data?: { reaction?: string } };
    }[];
    for (const row of rows) {
      const kind = row.body?.type;
      if (kind !== 'reaction' && kind !== 'unreaction') continue;
      const reaction = row.body?.data?.reaction;
      if (!reaction) continue;
      const list = byPost.get(row.toId) ?? [];
      list.push({
        type: kind,
        data: { reaction },
        profile: { id: row.fromId },
        createdAt: row.createdAt,
      });
      byPost.set(row.toId, list);
    }
    lastId = rows[rows.length - 1]?.id ?? null;
    if (!lastId || rows.length < EXPORT_PAGE_SIZE) break;
  }

  const postIds: string[] = [];
  for (const [postId, list] of byPost.entries()) {
    const current = currentReactionsFromEntries(list);
    if (current.length > 0) postIds.push(postId);
  }
  return postIds;
};

const collectMediaFromPosts = (
  files: Map<string, ExportMediaFile>,
  posts: PostWithMeta[],
) => {
  for (const post of posts) {
    const attachments: MediaAttachment[] =
      (post as { data?: { attachments?: MediaAttachment[] } }).data
        ?.attachments ?? [];
    for (const att of attachments) {
      const id = idFromMediaUrl(att.url);
      if (!id) continue;
      const filename = sanitizeFilename(att.filename || id);
      const existing = files.get(id);
      const usedIn = existing?.usedIn ?? [];
      if (!usedIn.includes(post.id)) usedIn.push(post.id);
      files.set(id, {
        mediaAttachmentId: id,
        path: `media/${id}-${filename}`,
        filename,
        mimetype: att.meta?.mimetype,
        size: att.meta?.size,
        usedIn,
      });
    }
  }
};

const collectMediaFromProfiles = (
  files: Map<string, ExportMediaFile>,
  profiles: Profile[],
) => {
  for (const profile of profiles) {
    for (const url of [profile.avatar, profile.header]) {
      if (!url) continue;
      const id = idFromMediaUrl(url);
      if (!id) continue;
      const filename = sanitizeFilename(filenameFromMediaUrl(url) || id);
      const existing = files.get(id);
      const usedIn = existing?.usedIn ?? [];
      if (!usedIn.includes(profile.id)) usedIn.push(profile.id);
      files.set(id, {
        mediaAttachmentId: id,
        path: `media/${id}-${filename}`,
        filename,
        usedIn,
      });
    }
  }
};

/**
 * Materialize an account's export as a zip archive under `destDir`: stage the
 * account's data in bounded passes (below), zip the staging directory into
 * `export.zip`, then reclaim the staging directory.
 *
 * The assembly never holds the account's data set in memory whole — each
 * unbounded read (created posts, reaction history, id-hydrates, ancestor CTE
 * seeds) is id-keyed / keyset paginated at `EXPORT_PAGE_SIZE`, each post is
 * serialized and written as its page is processed, and every media file is
 * streamed straight to the staging directory (never buffered). The only
 * retained state is O(distinct media) manifest metadata, which is small even
 * for a very large account. Review #237 r13: the async job's whole reason to
 * exist is that exports are unbounded, so the assembly must not re-introduce
 * the unbounded-memory risk it was built to remove.
 *
 * Returns the zip path and the export manifest.
 */
export const buildAccountExportZip = async (
  account: AccountWithMeta,
  destDir: string,
): Promise<{ zipPath: string; manifest: AccountExportManifest }> => {
  const { db } = await allpeepDb();
  await mkdir(destDir, { recursive: true });
  const staging = path.join(destDir, 'staging');
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });

  const profiles = await getProfiles(account.profiles.map((p) => p.id));
  const profileIds = profiles.map((p) => p.id);

  // account.json — only this account's own data (its email is included,
  // which is correct: it belongs to the exporting user).
  await writeFile(
    path.join(staging, 'account.json'),
    JSON.stringify(publicAccountSchema.parse(account), null, 2),
  );

  // profiles/ — each controlled profile in its public shape.
  await mkdir(path.join(staging, 'profiles'), { recursive: true });
  for (const profile of profiles) {
    const parsed = publicProfileSchema.safeParse(profile);
    if (parsed.success) {
      await writeFile(
        path.join(staging, 'profiles', `${profile.id}.json`),
        JSON.stringify(parsed.data, null, 2),
      );
    }
  }

  await mkdir(path.join(staging, 'posts/created'), { recursive: true });
  await mkdir(path.join(staging, 'posts/context'), { recursive: true });
  await mkdir(path.join(staging, 'posts/reacted-to'), { recursive: true });
  const mediaDir = path.join(staging, 'media');
  await mkdir(mediaDir, { recursive: true });

  let createdWritten = 0;
  let contextWritten = 0;
  let reactedWritten = 0;
  let createdHydrated = 0;
  let contextHydrated = 0;
  let reactedHydrated = 0;

  // Media referenced by the exported posts + profiles, keyed by media id.
  // O(distinct media) metadata only (the manifest) — the file bytes are
  // streamed to disk, never held in memory.
  const mediaFiles = new Map<string, ExportMediaFile>();

  // Serialize one post to its public shape and write it to `<dir>/<id>.json`.
  // Returns false when the post could not be serialized (it is then dropped
  // from the artifact and counted in `skipped`, not hidden).
  const writePost = async (
    post: PostWithMeta,
    dir: string,
  ): Promise<boolean> => {
    const parsed = publicPostSchema.safeParse(post);
    if (!parsed.success) {
      log.warn(
        `Skipping post ${post.id} in export (could not serialize to public post)`,
      );
      return false;
    }
    await writeFile(
      path.join(staging, `${dir}/${post.id}.json`),
      JSON.stringify(parsed.data, null, 2),
    );
    return true;
  };

  // Pass 1 — the account's own created posts, id-keyed keyset pages. Soft
  // deleted posts are included: the id walk applies no `deletedAt` filter and
  // the hydrate reads with `softDelete: false`, so a post the account deleted
  // still lands in the export (a complete record, not the live view).
  const createdIds: string[] = [];
  let lastCreatedId: string | null = null;
  for (;;) {
    const conditions = [inArray(postsTable.creatorId, profileIds)];
    if (lastCreatedId) conditions.push(gt(postsTable.id, lastCreatedId));
    const page = (await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(and(...conditions))
      .orderBy(asc(postsTable.id))
      .limit(EXPORT_PAGE_SIZE)) as unknown as { id: string }[];
    if (page.length === 0) break;
    const pageIds = page.map((r) => r.id);
    createdIds.push(...pageIds);
    // Consume each page as it hydrates: write the posts, count them, and
    // collect their media, then drop the page — never hold them all.
    await hydratePostsByIdsPaged(pageIds, async (posts) => {
      createdHydrated += posts.length;
      for (const post of posts) {
        const written = await writePost(post, 'posts/created');
        if (written) createdWritten += 1;
      }
      collectMediaFromPosts(mediaFiles, posts);
    });
    lastCreatedId = page[page.length - 1].id;
    if (page.length < EXPORT_PAGE_SIZE) break;
  }
  const createdIdSet = new Set(createdIds);

  // Pass 2 — thread context: the created posts' `reply_to` ancestors (one
  // bounded CTE per id page), excluding the created posts themselves. Written
  // as context-only posts; their attachments are deliberately NOT bundled —
  // context is other accounts' content shown only so the account's replies
  // are readable in-thread, and the export must stay the account's own data.
  const contextIds = (await ancestorIdsOf(db, createdIds)).filter(
    (ancestor) => !createdIdSet.has(ancestor),
  );
  await hydratePostsByIdsPaged(contextIds, async (posts) => {
    contextHydrated += posts.length;
    for (const post of posts) {
      const written = await writePost(post, 'posts/context');
      if (written) contextWritten += 1;
    }
  });

  // Pass 3 — posts the controlled profiles reacted to (net reaction, deduped
  // via `currentReactionsFromEntries`), the entry history read in keyset
  // pages and each post hydrated + written as its page resolves.
  const reactedIds = await reactedPostIdsOf(db, profileIds);
  await hydratePostsByIdsPaged(reactedIds, async (posts) => {
    reactedHydrated += posts.length;
    for (const post of posts) {
      const written = await writePost(post, 'posts/reacted-to');
      if (written) reactedWritten += 1;
    }
    collectMediaFromPosts(mediaFiles, posts);
  });

  // Profile avatar/header media, collected last so a file shared with a post
  // keeps its post id(s) in `usedIn` first (the profile id is appended).
  collectMediaFromProfiles(mediaFiles, profiles);

  // media/ — every referenced file streamed to disk (never buffered) in
  // pages; a file that cannot be read is omitted and revealed by
  // `skippedMedia` rather than hidden.
  let mediaBytes = 0;
  const bundled: ExportMediaFile[] = [];
  const allMedia = [...mediaFiles.values()];
  for (let i = 0; i < allMedia.length; i += EXPORT_PAGE_SIZE) {
    for (const file of allMedia.slice(i, i + EXPORT_PAGE_SIZE)) {
      const bytes = await copyMediaFile(file, staging);
      if (bytes === null) continue;
      mediaBytes += bytes;
      bundled.push(file);
    }
  }
  await writeFile(
    path.join(mediaDir, 'manifest.json'),
    JSON.stringify(bundled, null, 2),
  );

  const manifest: AccountExportManifest = {
    exportedAt: new Date().toISOString(),
    accountId: account.id,
    profileIds,
    counts: {
      createdPosts: createdWritten,
      contextPosts: contextWritten,
      reactedPosts: reactedWritten,
      media: bundled.length,
      mediaBytes,
      // Posts that hydrated but could not be serialized to a public post are
      // dropped from the artifact; the counts reveal the shrink instead of
      // hiding it (review #237 r2).
      skipped:
        createdHydrated +
        contextHydrated +
        reactedHydrated -
        (createdWritten + contextWritten + reactedWritten),
      // Files referenced by the posts/profiles but missing from storage (or
      // on remote storage): the manifest reveals the shrink instead of
      // hiding it, like `skipped` for posts (review #237 r9).
      skippedMedia: allMedia.length - bundled.length,
    },
  };
  await writeFile(
    path.join(staging, 'meta.json'),
    JSON.stringify(manifest, null, 2),
  );

  const zipPath = path.join(destDir, 'export.zip');
  await rm(zipPath, { force: true });
  await zipDirectory(staging, zipPath);
  await rm(staging, { recursive: true, force: true });

  return { zipPath, manifest };
};

/**
 * Copy one media file from storage into `<staging>/<file.path>`. Returns the
 * byte size, or null if the file cannot be read (it is then omitted).
 */
const copyMediaFile = async (
  file: ExportMediaFile,
  staging: string,
): Promise<number | null> => {
  const id = file.mediaAttachmentId;
  if (!id) return null;
  try {
    const storage = await mediaStorage();
    if (!storage.isLocal()) {
      log.warn(
        `Skipping non-local media ${id} (remote storage is not bundled)`,
      );
      return null;
    }
    // Stream (never buffer) — a multi-hundred-megabyte video must not be
    // materialised as a Buffer (the media/index.ts convention).
    const stream = await storage.getStream(id);
    const finalPath = path.join(staging, file.path);
    await mkdir(path.dirname(finalPath), { recursive: true });
    await pipeline(
      Readable.fromWeb(
        stream as unknown as import('node:stream/web').ReadableStream<Uint8Array>,
      ),
      createWriteStream(finalPath),
    );
    return (await stat(finalPath)).size;
  } catch (error) {
    log.warn(
      `Could not include media ${id} in export: ${(error as Error).message}`,
    );
    return null;
  }
};

// Media URLs look like `<root><prefix>/allpeep/<id>/<filename>`.
const idFromMediaUrl = (url: string): string | null => {
  const m = url.match(/\/allpeep\/([A-Za-z0-9_-]+)/);
  return m?.[1] ?? null;
};

const filenameFromMediaUrl = (url: string): string | null => {
  const parts = url.split('/');
  return parts[parts.length - 1] || null;
};

const sanitizeFilename = (name: string): string =>
  name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 128) || 'file';
