#!/usr/bin/env node
/**
 * Copy platform/web/docs markdown into a docs dir and rewrite /docs/ links.
 *
 * Usage:
 *   node scripts/prepare-docs.mjs --workdir
 *   node scripts/prepare-docs.mjs --ref main --out .build/main/docs --link-prefix /main
 *
 * --link-prefix makes cross-links version-absolute (e.g. /main/admin) so they
 * work in new tabs and in raw .md files, not only inside the SPA.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const DEFAULT_OUT = path.join(SITE_ROOT, 'docs');
const SOURCE_PREFIX = 'platform/web/docs';
const WORKTREE_SOURCE = path.join(REPO_ROOT, SOURCE_PREFIX);

const parseArgs = (argv) => {
  const out = {
    ref: 'HEAD',
    outDir: DEFAULT_OUT,
    workdir: false,
    linkPrefix: '',
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--ref') out.ref = argv[++i];
    else if (arg === '--out') out.outDir = path.resolve(process.cwd(), argv[++i]);
    else if (arg === '--workdir') out.workdir = true;
    else if (arg === '--link-prefix') out.linkPrefix = argv[++i] || '';
  }
  return out;
};

/** Rewrite /docs and /docs/… to version-prefixed (or root-relative) paths. */
const rewriteDocsLinks = (text, linkPrefix) => {
  const prefix = (linkPrefix || '').replace(/\/$/, '');

  const mapPath = (rest) => {
    const pathPart = !rest || rest === '' ? '/' : rest;
    if (!prefix) return pathPart === '/' ? '/' : pathPart;
    if (pathPart === '/') return `${prefix}/`;
    return `${prefix}${pathPart}`;
  };

  return text
    .replace(/\]\(\/docs(\/[^)]*)?\)/g, (_m, rest) => `](${mapPath(rest)})`)
    .replace(
      /(href=["'])\/docs(\/[^"']*)?/g,
      (_m, pre, rest) => `${pre}${mapPath(rest)}`,
    );
};

const walkMarkdown = (dir, fn) => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walkMarkdown(full, fn);
    else if (name.endsWith('.md')) fn(full);
  }
};

const copyWorktree = (outDir) => {
  if (!existsSync(WORKTREE_SOURCE)) {
    throw new Error(`Missing ${WORKTREE_SOURCE}`);
  }
  mkdirSync(outDir, { recursive: true });
  cpSync(WORKTREE_SOURCE, outDir, { recursive: true });
};

const extractFromGit = (ref, outDir) => {
  const staging = path.join(
    SITE_ROOT,
    '.build',
    `_archive-${process.pid}-${Date.now()}`,
  );
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });

  const archive = spawnSync(
    'git',
    ['archive', '--format=tar', ref, SOURCE_PREFIX],
    { cwd: REPO_ROOT, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
  );
  if (archive.status !== 0) {
    rmSync(staging, { recursive: true, force: true });
    throw new Error(
      `git archive ${ref} ${SOURCE_PREFIX} failed: ${archive.stderr?.toString() || archive.stdout?.toString() || ''}`,
    );
  }

  const tar = spawnSync('tar', ['-x', '-C', staging], {
    input: archive.stdout,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (tar.status !== 0) {
    rmSync(staging, { recursive: true, force: true });
    throw new Error(`tar extract failed: ${tar.stderr?.toString() || ''}`);
  }

  const extracted = path.join(staging, ...SOURCE_PREFIX.split('/'));
  if (!existsSync(extracted)) {
    rmSync(staging, { recursive: true, force: true });
    throw new Error(`No ${SOURCE_PREFIX} in git ref ${ref}`);
  }

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(path.dirname(outDir), { recursive: true });
  cpSync(extracted, outDir, { recursive: true });
  rmSync(staging, { recursive: true, force: true });
};

const main = () => {
  const { ref, outDir, workdir, linkPrefix } = parseArgs(process.argv.slice(2));

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  if (workdir || ref === 'WORKTREE') {
    copyWorktree(outDir);
  } else {
    extractFromGit(ref, outDir);
  }

  walkMarkdown(outDir, (file) => {
    const original = readFileSync(file, 'utf8');
    const rewritten = rewriteDocsLinks(original, linkPrefix);
    if (rewritten !== original) writeFileSync(file, rewritten);
  });

  console.error(
    `prepared docs from ${workdir ? 'worktree' : ref} → ${outDir}` +
      (linkPrefix ? ` (link-prefix ${linkPrefix})` : ''),
  );
};

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
