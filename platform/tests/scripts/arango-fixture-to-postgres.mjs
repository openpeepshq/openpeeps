/**
 * Converts an unpacked Arango JSONL backup directory into the current Postgres
 * backup shape (row JSONL + metadata.databaseType/schemaVersion).
 *
 * Used by fixtures:generate-backups. Imports mapping helpers from built core.
 */
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const coreDist = path.join(repoRoot, 'platform/core/dist/db/migration');

const {
  arangoDocToDocumentRow,
  arangoDocToEdgeRow,
  buildPostCreatorIdByPostId,
  isEdgeCollection,
  normalizeImportId,
} = await import(path.join(coreDist, 'transform.js'));
const { DOCUMENT_IMPORT_ORDER, EDGE_IMPORT_ORDER } = await import(
  path.join(coreDist, 'shared.js')
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEARCH_VECTOR_COLLECTIONS = new Set(['profiles', 'groups', 'posts']);

const readJournalLatestTag = async () => {
  const journalPath = path.join(
    repoRoot,
    'platform/core/src/db/pg/sql/meta/_journal.json',
  );
  const journal = JSON.parse(await readFile(journalPath, 'utf8'));
  const last = journal.entries?.at(-1)?.tag;
  if (!last) {
    throw new Error(`No journal tags in ${journalPath}`);
  }
  return last;
};

const readJsonl = async (filePath) => {
  try {
    const text = await readFile(filePath, 'utf8');
    return text
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (err) {
    if (err && err.code === 'ENOENT') return [];
    throw err;
  }
};

const writeJsonl = async (filePath, rows) => {
  await writeFile(
    filePath,
    rows.length ? `${rows.map((r) => JSON.stringify(r)).join('\n')}\n` : '',
  );
};

const ensureEdgeUuidId = (collection, row) => {
  if (!isEdgeCollection(collection)) {
    return row;
  }
  if (typeof row.id === 'string' && UUID_RE.test(row.id)) {
    const normalized = normalizeImportId(row.id) ?? row.id;
    return normalized === row.id ? row : { ...row, id: normalized };
  }
  return { ...row, id: randomUUID() };
};

const documentRowIsImportable = (collection, row) => {
  if (collection === 'posts' && !row.creatorId) return false;
  if (collection === 'jamEvents' && !row.postId) return false;
  if (collection === 'profileSettings' && !row.profileId) return false;
  return true;
};

const prepareHashtagRows = (rows, hashtagIdRemap) => {
  const byName = new Map();
  const prepared = [];
  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id : undefined;
    const name =
      typeof row.name === 'string' ? row.name.trim().toLowerCase() : '';
    if (!name) {
      if (id) hashtagIdRemap.set(id, '');
      continue;
    }
    row.name = name;
    const existing = byName.get(name);
    if (existing) {
      if (id) hashtagIdRemap.set(id, String(existing.id ?? ''));
      continue;
    }
    byName.set(name, row);
    prepared.push(row);
  }
  return prepared;
};

const applyHashtagEdgeRemap = (collection, rows, hashtagIdRemap) => {
  if (collection !== 'postHashtags' || !hashtagIdRemap.size) {
    return rows;
  }
  const out = [];
  for (const row of rows) {
    const toId = typeof row.toId === 'string' ? row.toId : undefined;
    if (!toId || !hashtagIdRemap.has(toId)) {
      out.push(row);
      continue;
    }
    const mapped = hashtagIdRemap.get(toId);
    if (!mapped) continue;
    out.push({ ...row, toId: mapped });
  }
  return out;
};

const dedupeById = (rows) => {
  const byKey = new Map();
  const withoutKey = [];
  for (const row of rows) {
    const key = normalizeImportId(row.id ?? row.key);
    if (key) {
      byKey.set(key, typeof row.id === 'string' ? { ...row, id: key } : row);
    } else {
      withoutKey.push(row);
    }
  }
  return [...byKey.values(), ...withoutKey];
};

const finalizeRow = (collection, row) => {
  const next = { ...row };
  if (SEARCH_VECTOR_COLLECTIONS.has(collection) && next.searchVector == null) {
    // Empty tsvector; triggers/backfills on live DBs prefer computed values,
    // but fixture restores stamp schemaVersion at HEAD where the column is NOT NULL.
    next.searchVector = '';
  }
  return next;
};

/**
 * Legacy Arango posts stored content on the create entry (`data`), not the post.
 * Postgres feeds require that payload on `posts.body` (former Arango `data`
 * migration). Copy it during conversion since we skip the Arango ledger.
 */
const backfillPostBodiesFromCreateEntries = (posts, entries) => {
  const createDataByPostId = new Map();
  for (const edge of entries) {
    const entryType = edge.body?.type ?? edge.type;
    if (entryType !== 'create') continue;
    const postId = edge.toId;
    const data = edge.body?.data ?? edge.data;
    if (typeof postId === 'string' && data && typeof data === 'object') {
      createDataByPostId.set(postId, data);
    }
  }

  let filled = 0;
  for (const post of posts) {
    const body = post.body;
    const hasBody =
      body && typeof body === 'object' && Object.keys(body).length > 0;
    if (hasBody) continue;
    const data = createDataByPostId.get(post.id);
    if (!data) continue;
    post.body = { ...data };
    if (!post.type && typeof data.type === 'string') {
      post.type = data.type;
    }
    filled += 1;
  }
  return filled;
};

/**
 * @param {string} backupDir Unpacked backup root (has collections/ + metadata.json)
 * @param {object} [metadataExtras] Merged into metadata.json
 */
export const convertArangoBackupDirToPostgres = async (
  backupDir,
  metadataExtras = {},
) => {
  const collectionsDir = path.join(backupDir, 'collections');
  const context = {
    postCreatorIdByPostId: await buildPostCreatorIdByPostId(collectionsDir),
    hashtagIdRemap: new Map(),
  };

  const known = new Set(
    [...DOCUMENT_IMPORT_ORDER, ...EDGE_IMPORT_ORDER].filter(
      (name) => name !== 'dataMigrations',
    ),
  );
  const existing = await readdir(collectionsDir);
  for (const file of existing) {
    if (!file.endsWith('.jsonl')) continue;
    const collection = file.slice(0, -'.jsonl'.length);
    if (!known.has(collection)) {
      await rm(path.join(collectionsDir, file), { force: true });
    }
  }

  for (const collection of DOCUMENT_IMPORT_ORDER) {
    if (collection === 'dataMigrations') continue;
    const filePath = path.join(collectionsDir, `${collection}.jsonl`);
    const docs = await readJsonl(filePath);
    if (!docs.length) {
      await rm(filePath, { force: true });
      continue;
    }

    let mapped = docs.map((doc) =>
      arangoDocToDocumentRow(collection, doc, context),
    );
    if (collection === 'hashtags') {
      mapped = prepareHashtagRows(mapped, context.hashtagIdRemap);
    } else {
      mapped = mapped.filter((row) => documentRowIsImportable(collection, row));
    }
    mapped = dedupeById(mapped).map((row) => finalizeRow(collection, row));
    if (!mapped.length) {
      await rm(filePath, { force: true });
      continue;
    }
    await writeJsonl(filePath, mapped);
  }

  for (const collection of EDGE_IMPORT_ORDER) {
    const filePath = path.join(collectionsDir, `${collection}.jsonl`);
    const docs = await readJsonl(filePath);
    if (!docs.length) {
      await rm(filePath, { force: true });
      continue;
    }

    let mapped = docs
      .map((doc) => arangoDocToEdgeRow(collection, doc))
      .map((row) => ensureEdgeUuidId(collection, row));
    mapped = applyHashtagEdgeRemap(collection, mapped, context.hashtagIdRemap);
    mapped = dedupeById(mapped);
    if (!mapped.length) {
      await rm(filePath, { force: true });
      continue;
    }
    await writeJsonl(filePath, mapped);
  }

  const postsPath = path.join(collectionsDir, 'posts.jsonl');
  const entriesPath = path.join(collectionsDir, 'entries.jsonl');
  const posts = await readJsonl(postsPath);
  const entries = await readJsonl(entriesPath);
  if (posts.length && entries.length) {
    const filled = backfillPostBodiesFromCreateEntries(posts, entries);
    if (filled > 0) {
      console.log(`Backfilled post.body from create entries on ${filled} post(s)`);
      await writeJsonl(postsPath, posts);
    }
  }

  const schemaVersion = await readJournalLatestTag();
  const metaPath = path.join(backupDir, 'metadata.json');
  let prior = {};
  try {
    prior = JSON.parse(await readFile(metaPath, 'utf8'));
  } catch {
    /* optional */
  }
  const metadata = {
    ...prior,
    ...metadataExtras,
    databaseType: 'postgres',
    createdAt: new Date().toISOString(),
    schemaVersion,
    config: {
      hostname: 'magicfactory.ap.social',
      ...prior.config,
      ...metadataExtras.config,
    },
  };
  await writeFile(metaPath, `${JSON.stringify(metadata, null, 2)}\n`);
  return metadata;
};
