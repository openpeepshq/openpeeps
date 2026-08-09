#!/usr/bin/env node
/**
 * Emit slug-mapped raw .md files for LLM-friendly URLs.
 *
 * Mapping (same as SPA slugs):
 *   index.md              → index.md        (/index.md)
 *   user/index.md         → user.md         (/user.md)
 *   user/markdown.md      → user/markdown.md
 *
 * Usage:
 *   node scripts/emit-raw-markdown.mjs --from docs --to dist/main
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');

const parseArgs = (argv) => {
  const out = {
    from: path.join(SITE_ROOT, 'docs'),
    to: path.join(SITE_ROOT, 'public'),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') out.from = path.resolve(argv[++i]);
    else if (argv[i] === '--to') out.to = path.resolve(argv[++i]);
  }
  return out;
};

const collectMarkdownFiles = (root) => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) files.push(full);
    }
  };
  walk(root);
  return files;
};

/** platform/web/docs relative path → URL path under version (no leading slash). */
const fileToRawPath = (relativePath) => {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized === 'index.md') return 'index.md';
  if (normalized.endsWith('/index.md')) {
    return `${normalized.slice(0, -'/index.md'.length)}.md`;
  }
  return normalized;
};

const main = () => {
  const { from, to } = parseArgs(process.argv.slice(2));
  if (!existsSync(from)) {
    throw new Error(`Missing markdown source dir: ${from}`);
  }
  mkdirSync(to, { recursive: true });

  let count = 0;
  for (const filePath of collectMarkdownFiles(from)) {
    const relative = path.relative(from, filePath);
    const rawPath = fileToRawPath(relative);
    const dest = path.join(to, rawPath);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(filePath));
    count += 1;
  }
  console.error(`emitted ${count} raw .md file(s) → ${to}`);
};

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
