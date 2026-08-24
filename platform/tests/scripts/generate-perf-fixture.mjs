/**
 * Builds fixtures/backups/perf-scale.zip by cloning posts (+ edges) from
 * default-install.zip so offline perf runs exercise larger edge scans.
 *
 * Expects default-install.zip in the current Postgres backup format.
 *
 *   pnpm --filter @openpeepshq/tests run fixtures:generate-perf
 */
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  mkdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceZip = path.join(root, 'fixtures/backups/default-install.zip');
const outZip = path.join(root, 'fixtures/backups/perf-scale.zip');
const TARGET_POSTS = Number(process.env.PERF_FIXTURE_POSTS || 400);
const PERF_ACCOUNT_EMAIL = 'trinay+0@allpeep.com';
// bcrypt for the synthetic CI-only password `perf-password-1`.
const PERF_PASSWORD_HASH =
  '$2b$10$HzZGKmJlpujQenfsu2JSn.ZusGKHHxeYkGQ4JdnlrTgbqJKJ/ki1q';

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

const remapId = (value, idMap) => {
  if (typeof value !== 'string') return value;
  let next = value;
  for (const [from, to] of idMap) {
    if (next === from) return to;
    if (next.includes(from)) next = next.split(from).join(to);
  }
  return next;
};

const cloneRow = (row, idMap) => {
  const raw = JSON.stringify(row);
  let next = raw;
  for (const [from, to] of idMap) {
    next = next.split(from).join(to);
  }
  return JSON.parse(next);
};

const tmp = await mkdtemp(path.join(tmpdir(), 'op-perf-fixture-'));
try {
  execFileSync('unzip', ['-q', sourceZip, '-d', tmp]);
  const collectionsDir = path.join(tmp, 'collections');
  const accountsPath = path.join(collectionsDir, 'accounts.jsonl');
  const accounts = await readJsonl(accountsPath);
  const perfAccount = accounts.find(
    (account) => account.email === PERF_ACCOUNT_EMAIL,
  );
  if (!perfAccount) {
    throw new Error(`Source fixture has no ${PERF_ACCOUNT_EMAIL} account`);
  }
  perfAccount.passwordHash = PERF_PASSWORD_HASH;
  perfAccount.emailValidated = true;
  await writeJsonl(accountsPath, accounts);

  const posts = await readJsonl(path.join(collectionsDir, 'posts.jsonl'));
  if (!posts.length) {
    throw new Error('Source fixture has no posts');
  }
  if (posts.some((post) => !post.id)) {
    throw new Error(
      'Source fixture posts are not Postgres-shaped (missing id); regenerate default-install.zip first',
    );
  }

  const edgeFiles = [
    'entries.jsonl',
    'postGroups.jsonl',
    'audience.jsonl',
    'mentions.jsonl',
    'reactions.jsonl',
    'replyTo.jsonl',
    'repost.jsonl',
    'bookmarks.jsonl',
    'postHashtags.jsonl',
  ];

  const edgesByFile = {};
  for (const file of edgeFiles) {
    edgesByFile[file] = await readJsonl(path.join(collectionsDir, file));
  }

  // Ensure note bodies exist under body (Postgres row shape). Converter already
  // backfills from create entries; keep this for hand-edited sources.
  const createEntryByPost = new Map(
    edgesByFile['entries.jsonl']
      .filter((edge) => edge.body?.type === 'create' || edge.type === 'create')
      .map((edge) => [String(edge.toId), edge]),
  );
  const postsMissingBody = posts.filter(
    (post) =>
      !post.body ||
      typeof post.body !== 'object' ||
      Object.keys(post.body).length === 0,
  );
  for (const post of postsMissingBody) {
    const entry = createEntryByPost.get(String(post.id));
    const data = entry?.body?.data ?? entry?.data;
    if (!data?.type) {
      throw new Error(`Post ${post.id} has no create entry data to backfill`);
    }
    post.body = { ...data };
    if (!post.type) post.type = data.type;
  }
  if (postsMissingBody.length) {
    console.log(`Backfilled body on ${postsMissingBody.length} post(s)`);
  }

  const notePosts = posts.filter((p) => p.type === 'note' || !p.type);
  const seedPosts = notePosts.length ? notePosts : posts;
  const outPosts = [...posts];

  let i = 0;
  while (outPosts.length < TARGET_POSTS) {
    const seed = seedPosts[i % seedPosts.length];
    const oldId = seed.id;
    const newId = randomUUID();
    const idMap = new Map([[oldId, newId]]);

    const cloned = cloneRow(seed, idMap);
    cloned.id = newId;
    cloned.createdAt = new Date(
      Date.now() - (TARGET_POSTS - outPosts.length) * 60_000,
    ).toISOString();
    cloned.updatedAt = cloned.createdAt;
    outPosts.push(cloned);

    for (const file of edgeFiles) {
      const related = edgesByFile[file].filter((edge) => {
        const from = String(edge.fromId ?? '');
        const to = String(edge.toId ?? '');
        return from === oldId || to === oldId;
      });
      for (const edge of related) {
        const edgeId = randomUUID();
        const edgeMap = new Map([...idMap, [edge.id, edgeId]]);
        const clonedEdge = cloneRow(edge, edgeMap);
        clonedEdge.id = edgeId;
        clonedEdge.fromId = remapId(clonedEdge.fromId, idMap);
        clonedEdge.toId = remapId(clonedEdge.toId, idMap);
        edgesByFile[file].push(clonedEdge);
      }
    }
    i += 1;
  }

  await writeJsonl(path.join(collectionsDir, 'posts.jsonl'), outPosts);
  for (const file of edgeFiles) {
    await writeJsonl(path.join(collectionsDir, file), edgesByFile[file]);
  }

  const metaPath = path.join(tmp, 'metadata.json');
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  if (meta.databaseType !== 'postgres' || !meta.schemaVersion) {
    throw new Error(
      'Source fixture metadata must include databaseType=postgres and schemaVersion',
    );
  }
  meta.perfScale = { targetPosts: TARGET_POSTS, source: 'default-install' };
  meta.createdAt = new Date().toISOString();
  await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);

  await mkdir(path.dirname(outZip), { recursive: true });
  await rm(outZip, { force: true });
  execFileSync('zip', ['-qr', outZip, '.'], { cwd: tmp });
  console.log(
    `Wrote ${outZip} with ${outPosts.length} posts (target ${TARGET_POSTS})`,
  );
} finally {
  await rm(tmp, { recursive: true, force: true });
}
