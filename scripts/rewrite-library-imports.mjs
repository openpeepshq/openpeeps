#!/usr/bin/env node
/**
 * One-shot: rewrite `@/` aliases in react-ui to relative paths, and rewrite
 * `zod` imports outside @openpeepshq/common to `@openpeepshq/common/zod`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXTS = ['.ts', '.tsx', '.d.ts', '.js', '.jsx'];

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

const resolveAt = (srcDir, spec) => {
  const target = path.join(srcDir, spec.slice(2));
  for (const ext of EXTS) {
    if (fs.existsSync(target + ext)) return target + ext;
  }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    for (const ext of EXTS) {
      const indexFile = path.join(target, `index${ext}`);
      if (fs.existsSync(indexFile)) return indexFile;
    }
  }
  if (fs.existsSync(target)) return target;
  return null;
};

const toRelative = (fromFile, targetFile) => {
  let rel = path.relative(path.dirname(fromFile), targetFile);
  rel = rel.split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel.replace(/\.(ts|tsx|d\.ts|js|jsx)$/, '');
};

const rewriteAt = () => {
  const srcDir = path.join(root, 'libraries/react-ui/src');
  const re = /(['"])(@\/[A-Za-z0-9_./-]+)\1/g;
  let files = 0;
  let specs = 0;
  const unresolved = [];
  for (const file of walk(srcDir)) {
    const contents = fs.readFileSync(file, 'utf8');
    if (!re.test(contents)) continue;
    re.lastIndex = 0;
    let next = '';
    let last = 0;
    let changed = false;
    for (const match of contents.matchAll(re)) {
      const [quoted, quote, spec] = match;
      const target = resolveAt(srcDir, spec);
      if (!target) {
        unresolved.push(`${path.relative(root, file)}: ${spec}`);
        continue;
      }
      next += contents.slice(last, match.index);
      next += `${quote}${toRelative(file, target)}${quote}`;
      last = match.index + quoted.length;
      specs += 1;
      changed = true;
    }
    if (changed) {
      next += contents.slice(last);
      fs.writeFileSync(file, next);
      files += 1;
    }
  }
  if (unresolved.length) {
    console.error('Unresolvable @/ specifiers:');
    for (const line of unresolved) console.error(`  ${line}`);
    process.exit(1);
  }
  console.log(`react-ui: rewrote ${specs} @/ specifiers in ${files} files`);
};

const ZOD_RE =
  /(from\s+|import\s*\(\s*)(['"])zod\2|import\s+\*\s+as\s+(\w+)\s+from\s+(['"])zod\4/g;

const rewriteZod = () => {
  const dirs = [
    'platform/client',
    'platform/react',
    'platform/rn-components',
    'platform/core',
    'platform/server',
    'platform/web',
    'platform/mcp',
    'libraries/react-ui',
    'examples/component-gallery',
    'examples/greeter-plugin',
  ];
  let files = 0;
  for (const rel of dirs) {
    for (const file of walk(path.join(root, rel))) {
      const contents = fs.readFileSync(file, 'utf8');
      if (!contents.includes("from 'zod'") && !contents.includes('from "zod"') && !contents.includes("from 'zod'") && !/from\s+['"]zod['"]/.test(contents)) {
        continue;
      }
      const next = contents.replace(
        /((?:from|import)\s+)(['"])zod\2/g,
        `$1$2@openpeepshq/common/zod$2`,
      );
      if (next !== contents) {
        fs.writeFileSync(file, next);
        files += 1;
      }
    }
  }
  console.log(`zod: rewrote imports in ${files} files`);
};

rewriteAt();
rewriteZod();
