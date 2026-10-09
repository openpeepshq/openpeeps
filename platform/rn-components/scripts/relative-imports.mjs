#!/usr/bin/env node
/**
 * One-shot codemod: rewrite `~/x` import specifiers under src/ to relative
 * paths, then the `~/*` tsconfig mapping can be removed so that future alias
 * imports fail at typecheck instead of breaking consumers at publish time.
 *
 * Resolution mirrors TS/Metro: `~/x` -> `src/x`, trying
 * `x.{ts,tsx,d.ts,js,jsx}` then `x/index.{...}`; specifiers that already carry
 * an extension (assets, css) are used as-is. Unresolvable specifiers abort
 * with a non-zero exit instead of being left behind.
 *
 * Usage: node scripts/relative-imports.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');
const EXTS = ['.ts', '.tsx', '.d.ts', '.js', '.jsx'];
const SPECIFIER_RE = /(['"])(~\/[A-Za-z0-9_./-]+)\1/g;

const resolveSpecifier = (spec) => {
  const target = path.join(srcDir, spec.slice(2));
  for (const ext of EXTS) {
    if (fs.existsSync(target + ext)) {
      return target + ext;
    }
  }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    for (const ext of EXTS) {
      const indexFile = path.join(target, `index${ext}`);
      if (fs.existsSync(indexFile)) {
        return indexFile;
      }
    }
  }
  if (fs.existsSync(target)) {
    return target;
  }
  return null;
};

const toRelativeSpecifier = (fromFile, targetFile) => {
  let rel = path.relative(path.dirname(fromFile), targetFile);
  rel = rel.split(path.sep).join('/');
  if (!rel.startsWith('.')) {
    rel = `./${rel}`;
  }
  // Keep the codebase's extension-free import style; assets keep theirs.
  return rel.replace(/\.(ts|tsx|d\.ts|js|jsx)$/, '');
};

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

// Pass 1: resolve every specifier; abort without writing if any fail.
const edits = new Map();
const unresolved = [];

for (const file of walk(srcDir)) {
  const contents = fs.readFileSync(file, 'utf8');
  if (!SPECIFIER_RE.test(contents)) {
    continue;
  }
  SPECIFIER_RE.lastIndex = 0;
  let next = '';
  let last = 0;
  let changed = false;
  let count = 0;
  for (const match of contents.matchAll(SPECIFIER_RE)) {
    const [quoted, quote, spec] = match;
    const target = resolveSpecifier(spec);
    if (!target) {
      unresolved.push(`${path.relative(root, file)}: ${spec}`);
      break;
    }
    next += contents.slice(last, match.index);
    next += `${quote}${toRelativeSpecifier(file, target)}${quote}`;
    last = match.index + quoted.length;
    count += 1;
    changed = true;
  }
  if (changed) {
    next += contents.slice(last);
    edits.set(file, { next, count });
  }
}

if (unresolved.length > 0) {
  console.error('Unresolvable ~/ specifiers (aborted, no rewrite applied):');
  for (const line of unresolved) {
    console.error(`  ${line}`);
  }
  process.exit(1);
}

// Pass 2: write.
for (const [file, { next }] of edits) {
  fs.writeFileSync(file, next);
}

const total = [...edits.values()].reduce((sum, e) => sum + e.count, 0);
console.log(
  `Rewrote ${total} ~/ specifiers across ${edits.size} files under src/`
);
