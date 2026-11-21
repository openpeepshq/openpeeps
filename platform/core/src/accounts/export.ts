import path from 'node:path';
import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { and, inArray, sql } from 'drizzle-orm';
import { entries as entriesEdge, posts as postsTable } from '../db/pg/schema';
import { logger } from '../log';
import { allpeepDb } from '../db';
import type { PgDb } from '../db';
import {
  AccountWithMeta,
  DbPost,
  MediaAttachment,
  PostWithMeta,
  PublicPost,
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

const log = logger('app:accounts:export');

/** A post that will be written to the zip. */
export interface ExportPostFile {
  /** Zip-relative JSON path, e.g. `posts/created/<id>.json`. */
  path: string;
  /** Serialized post in its public shape (no other users' private data). */
  post: PublicPost;
  /** True when the post was included only to give thread context. */
  contextOnly?: boolean;
}

/** A binary media file that will be written to the zip. */
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

export interface AccountExportBundle {
  account: AccountWithMeta;
  profiles: Profile[];
  createdPosts: ExportPostFile[];
  contextPosts: ExportPostFile[];
  reactedPosts: ExportPostFile[];
  media: ExportMediaFile[];
  /** Posts dropped during gathering because they could not be serialized. */
  skipped: number;
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
 * Read a set of posts by id, hydrating relations and transforming to their
 * public shape (so other users' private data — e.g. emails — is never
 * included). Soft-deleted rows are included (`fetchRowsByIds` only filters
 * `deletedAt IS NULL` when its `softDelete` argument is not exactly `false`)
 * so the export is a complete record of what the account authored or
 * interacted with: a post the account deleted is still that account's data
 * to receive back.
 */
const hydratePostsByIds = async (ids: string[]): Promise<PostWithMeta[]> => {
  if (ids.length === 0) return [];
  const { db } = await allpeepDb();
  const mapData = postsAuthMapping.data();
  const rows = await fetchRowsByIds(db, mapData.collection, ids, false);
  const hydrated = (await hydrateMapData(
    db,
    mapData,
    rows,
  )) as unknown as DbPost[];
  return Promise.all(
    hydrated.map((post) =>
      transformPost(post, undefined, { embedThreadPreview: false }),
    ),
  );
};

/**
 * Walk the `reply_to` chains above the given posts (post -> parent ->
 * grandparent ... up to each thread root) in a single recursive-CTE query and
 * return every ancestor post id. Capped to guard against pathological chains.
 *
 * This mirrors the canonical `reply_to` walk in `posts/activity.ts`
 * (`findReplyRootId`) — same edge direction (`from_id` = child, `to_id` =
 * parent), same `depth < 64` cap — generalized to many starting posts at once.
 * Keep the two in sync if the cap or the edge semantics ever change.
 */
const ancestorIdsOf = async (
  db: PgDb,
  postIds: string[],
): Promise<string[]> => {
  if (postIds.length === 0) return [];
  const result = (await db.execute(
    sql`
      WITH RECURSIVE walk AS (
        SELECT id AS node_id, 0 AS depth
        FROM (SELECT unnest(${sql.join(
          postIds.map((id) => sql`${id}`),
          ', ',
        )}))
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
  // Drop the starting posts themselves; only their ancestors are context.
  const starting = new Set(postIds);
  return result.rows.map((r) => r.node_id).filter((id) => !starting.has(id));
};

/**
 * Return the ids of posts that one of the given profiles currently has a net
 * (not retracted) reaction on. Reactions and unactions are de-duplicated
 * exactly the way the UI computes current reactions (latest wins per
 * (profile, emoji); only `reaction` entries survive).
 */
const reactedPostIdsOf = async (
  db: PgDb,
  profileIds: string[],
): Promise<string[]> => {
  if (profileIds.length === 0) return [];
  const rows = (await db
    .select({
      fromId: entriesEdge.fromId,
      toId: entriesEdge.toId,
      body: entriesEdge.body,
      createdAt: entriesEdge.createdAt,
    })
    .from(entriesEdge)
    .where(
      and(
        inArray(entriesEdge.fromId, profileIds),
        sql`body->>'type' in ('reaction', 'unreaction')`,
      ),
    )) as unknown as {
    fromId: string;
    toId: string;
    createdAt: string;
    body: { type?: string; data?: { reaction?: string } };
  }[];

  const byPost = new Map<
    string,
    {
      type: 'reaction' | 'unreaction';
      data: { reaction: string };
      profile: { id: string };
      createdAt: string;
    }[]
  >();
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
 * Gather everything the account's own data refers to: the controlled
 * profiles, the posts they created (plus thread context), the posts they
 * reacted to, and every media file those posts/profiles reference.
 */
export const gatherAccountExport = async (
  account: AccountWithMeta,
): Promise<AccountExportBundle> => {
  const { db } = await allpeepDb();

  const profiles = await getProfiles(account.profiles.map((p) => p.id));
  const profileIds = profiles.map((p) => p.id);

  // Posts created by any controlled profile. Soft-deleted posts are included
  // (no `deletedAt` filter): the export is a complete record of the account's
  // own content, including posts the account deleted.
  const createdRows = (await db
    .select({ id: postsTable.id })
    .from(postsTable)
    .where(inArray(postsTable.creatorId, profileIds))) as unknown as {
    id: string;
  }[];
  const createdIds = createdRows.map((r) => r.id);
  const createdPosts = await hydratePostsByIds(createdIds);
  const createdIdSet = new Set(createdIds);

  // Thread context: ancestor posts above every created reply, in one query.
  const contextPosts = await hydratePostsByIds(
    (await ancestorIdsOf(db, createdIds)).filter(
      (ancestor) => !createdIdSet.has(ancestor),
    ),
  );

  // Posts the controlled profiles reacted to.
  const reactedIds = await reactedPostIdsOf(db, profileIds);
  const reactedPosts = await hydratePostsByIds(reactedIds);

  // Media referenced by the above + profile avatar/header.
  const mediaFiles = new Map<string, ExportMediaFile>();
  collectMediaFromPosts(mediaFiles, createdPosts);
  collectMediaFromPosts(mediaFiles, reactedPosts);
  collectMediaFromProfiles(mediaFiles, profiles);

  const toFile = (
    post: PostWithMeta,
    dir: string,
    contextOnly = false,
  ): ExportPostFile | null => {
    const parsed = publicPostSchema.safeParse(post);
    if (!parsed.success) {
      log.warn(
        `Skipping post ${post.id} in export (could not serialize to public post)`,
      );
      return null;
    }
    return { path: `${dir}/${post.id}.json`, post: parsed.data, contextOnly };
  };

  const createdFiles = createdPosts
    .map((p) => toFile(p, 'posts/created'))
    .filter((f): f is ExportPostFile => f !== null);
  const contextFiles = contextPosts
    .map((p) => toFile(p, 'posts/context', true))
    .filter((f): f is ExportPostFile => f !== null);
  const reactedFiles = reactedPosts
    .map((p) => toFile(p, 'posts/reacted-to'))
    .filter((f): f is ExportPostFile => f !== null);

  // Posts that failed to serialize are dropped from the artifact; count them
  // so the manifest reveals the shrink instead of hiding it (review #237 r2).
  const skipped =
    createdPosts.length +
    contextPosts.length +
    reactedPosts.length -
    (createdFiles.length + contextFiles.length + reactedFiles.length);

  return {
    account,
    profiles,
    createdPosts: createdFiles,
    contextPosts: contextFiles,
    reactedPosts: reactedFiles,
    media: [...mediaFiles.values()],
    skipped,
  };
};

/**
 * Materialize a gathered bundle as a zip archive under `destDir`.
 * Returns the zip path and the export manifest.
 */
export const buildAccountExportZip = async (
  bundle: AccountExportBundle,
  destDir: string,
): Promise<{ zipPath: string; manifest: AccountExportManifest }> => {
  const { zipDirectory } = await import('../backups');
  await mkdir(destDir, { recursive: true });
  const staging = path.join(destDir, 'staging');
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });

  // account.json — only this account's own data (its email is included,
  // which is correct: it belongs to the exporting user).
  await writeFile(
    path.join(staging, 'account.json'),
    JSON.stringify(publicAccountSchema.parse(bundle.account), null, 2),
  );

  // profiles/ — each controlled profile in its public shape.
  await mkdir(path.join(staging, 'profiles'), { recursive: true });
  for (const profile of bundle.profiles) {
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
  for (const file of [
    ...bundle.createdPosts,
    ...bundle.contextPosts,
    ...bundle.reactedPosts,
  ]) {
    await writeFile(
      path.join(staging, file.path),
      JSON.stringify(file.post, null, 2),
    );
  }

  // media/ — the actual binary files plus a manifest.
  const mediaDir = path.join(staging, 'media');
  await mkdir(mediaDir, { recursive: true });
  const bundled: ExportMediaFile[] = [];
  let mediaBytes = 0;
  for (const file of bundle.media) {
    const bytes = await copyMediaFile(file, staging);
    if (bytes === null) continue;
    mediaBytes += bytes;
    bundled.push(file);
  }
  await writeFile(
    path.join(mediaDir, 'manifest.json'),
    JSON.stringify(bundled, null, 2),
  );

  const exportManifest: AccountExportManifest = {
    exportedAt: new Date().toISOString(),
    accountId: bundle.account.id,
    profileIds: bundle.profiles.map((p) => p.id),
    counts: {
      createdPosts: bundle.createdPosts.length,
      contextPosts: bundle.contextPosts.length,
      reactedPosts: bundle.reactedPosts.length,
      media: bundled.length,
      mediaBytes,
      skipped: bundle.skipped,
      // Files referenced by the posts/profiles but missing from storage
      // (or on remote storage): the manifest reveals the shrink instead of
      // hiding it, like `skipped` for posts (review #237 r9).
      skippedMedia: bundle.media.length - bundled.length,
    },
  };
  await writeFile(
    path.join(staging, 'meta.json'),
    JSON.stringify(exportManifest, null, 2),
  );

  const zipPath = path.join(destDir, 'export.zip');
  await rm(zipPath, { force: true });
  await zipDirectory(staging, zipPath);
  await rm(staging, { recursive: true, force: true });

  return { zipPath, manifest: exportManifest };
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
