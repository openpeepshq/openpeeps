/**
 * Builds fixtures/backups/perf-scale.zip by cloning posts (+ edges) from
 * default-install.zip so offline perf runs exercise larger edge scans.
 *
 *   pnpm --filter @openpeeps/tests run fixtures:generate-perf
 */
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  copyFile,
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
  for (const [from, to] of idMap) {
    if (value === from) return to;
    if (value.includes(from)) return value.split(from).join(to);
  }
  return value;
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
  const posts = await readJsonl(path.join(collectionsDir, 'posts.jsonl'));
  if (!posts.length) {
    throw new Error('Source fixture has no posts');
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

  const notePosts = posts.filter((p) => p.type === 'note' || !p.type);
  const seedPosts = notePosts.length ? notePosts : posts;
  const outPosts = [...posts];

  let i = 0;
  while (outPosts.length < TARGET_POSTS) {
    const seed = seedPosts[i % seedPosts.length];
    const oldKey = seed._key;
    const newKey = randomUUID();
    const idMap = new Map([
      [oldKey, newKey],
      [`posts/${oldKey}`, `posts/${newKey}`],
    ]);

    const cloned = cloneRow(seed, idMap);
    cloned.createdAt = new Date(
      Date.now() - (TARGET_POSTS - outPosts.length) * 60_000,
    ).toISOString();
    cloned.updatedAt = cloned.createdAt;
    outPosts.push(cloned);

    for (const file of edgeFiles) {
      const related = edgesByFile[file].filter((edge) => {
        const from = String(edge._from ?? '');
        const to = String(edge._to ?? '');
        return from.includes(oldKey) || to.includes(oldKey);
      });
      for (const edge of related) {
        const edgeKey = randomUUID();
        const edgeMap = new Map([
          ...idMap,
          [edge._key, edgeKey],
          [
            `${file.replace('.jsonl', '')}/${edge._key}`,
            `${file.replace('.jsonl', '')}/${edgeKey}`,
          ],
        ]);
        // Collection names in _id use camelCase without .jsonl
        const collection = file.replace(/\.jsonl$/, '');
        edgeMap.set(`${collection}/${edge._key}`, `${collection}/${edgeKey}`);
        const clonedEdge = cloneRow(edge, edgeMap);
        clonedEdge._key = edgeKey;
        if (clonedEdge._id) {
          clonedEdge._id = `${collection}/${edgeKey}`;
        }
        clonedEdge._from = remapId(clonedEdge._from, idMap);
        clonedEdge._to = remapId(clonedEdge._to, idMap);
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
  try {
    const meta = JSON.parse(await readFile(metaPath, 'utf8'));
    meta.perfScale = { targetPosts: TARGET_POSTS, source: 'default-install' };
    await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  } catch {
    /* optional */
  }

  await mkdir(path.dirname(outZip), { recursive: true });
  execFileSync('zip', ['-qr', outZip, '.'], { cwd: tmp });
  console.log(
    `Wrote ${outZip} with ${outPosts.length} posts (target ${TARGET_POSTS})`,
  );
} finally {
  await rm(tmp, { recursive: true, force: true });
}
