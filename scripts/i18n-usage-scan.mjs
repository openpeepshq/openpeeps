// i18n usage scan: every literal t('key') reference in platform source must
// exist in platform/i18n/src/locales/en.json, unless the call site passes a
// defaultValue (or a positional string default) that masks the miss.
//
// This is the code↔locale half of the i18n gate: check-i18n-parity.mjs only
// compares locales against each other, so a key that exists in no locale but
// is referenced from code ships as a visible raw key (or an i18next
// "returned an object" error). This scan catches that class.
//
//   node scripts/i18n-usage-scan.mjs              # report only, always exits 0
//   node scripts/i18n-usage-scan.mjs --strict     # exit 1 on unmasked misses
//   node scripts/i18n-usage-scan.mjs --diff main  # only files changed vs main
//
// --diff is the implementation-round mode: it flags a key your diff
// introduced that does not exist in en.json (or was added by the same diff —
// see below), so a new string you forgot to add to the locale files is
// caught before push. In --diff mode, keys present in the diff's added
// en.json lines are treated as satisfied.

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES_DIR = join(repoRoot, 'platform', 'i18n', 'src', 'locales');
const SOURCE_DIRS = ['platform/react/src', 'platform/rn-components/src'];

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const diffIdx = args.indexOf('--diff');
const diffBase = diffIdx >= 0 ? args[diffIdx + 1] || 'main' : null;

// ---------- en.json key resolution ----------

const readEn = () =>
  JSON.parse(readFileSync(join(LOCALES_DIR, 'en.json'), 'utf8'));

// Resolve "ns:key" (namespace form) or a plain dot path against en.json.
// Returns the resolved value (string | object | undefined).
const resolveKey = (en, raw) => {
  const [ns, ...rest] = raw.split(':');
  const parts = rest.length
    ? [ns, ...rest.join(':').split('.')]
    : raw.split('.');
  let node = en;
  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) node = node[part];
    else return undefined;
  }
  return node;
};

// A key "exists" if it resolves to a string, or if its sibling plural forms
// do. This repo stores plurals as sibling-suffix keys (`posts.vote.count_one`
// / `_other`), so a `t('posts.vote.count', { count })` call is satisfied when
// no `count` leaf exists but `count_one`/`count_other` do.
const keyExists = (en, raw) => {
  if (typeof resolveKey(en, raw) === 'string') return true;
  for (const suffix of ['_one', '_other', '_0', '_1', '_2', '_few', '_many']) {
    if (typeof resolveKey(en, `${raw}${suffix}`) === 'string') return true;
  }
  return false;
};

// Keys added to en.json by the current diff (added lines are enough: JSON
// value strings contain the key path contextually — we match added key
// lines `"key":` and reconstruct nothing; a key path is satisfied if its
// final segment appears on an added line).
const keysAddedByDiff = () => {
  if (!diffBase) return new Set();
  let out = '';
  try {
    out = execSync(
      `git diff ${diffBase} -- platform/i18n/src/locales/en.json`,
      { encoding: 'utf-8' },
    );
  } catch {
    return new Set();
  }
  const added = new Set();
  for (const line of out.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const m = line.match(/"([\w.-]+)"\s*:/);
      if (m) added.add(m[1]);
    }
  }
  return added;
};

// ---------- t() call scanning ----------

const T_CALL_RE = /\bt\s*\(\s*(['"])((?:[^'\\]|\\.)*?)\1/gm;

const walkSourceFiles = (roots) => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|jsx)$/.test(name) && !name.endsWith('.d.ts'))
        files.push(p);
    }
  };
  for (const r of roots) walk(join(repoRoot, r));
  return files;
};

let changedFiles = null;
if (diffBase) {
  try {
    changedFiles = new Set(
      execSync(`git diff --name-only ${diffBase} -- ${SOURCE_DIRS.join(' ')}`, {
        encoding: 'utf-8',
      })
        .split('\n')
        .filter(Boolean),
    );
  } catch {
    changedFiles = null;
  }
}

// Does the call pass a defaultValue / positional default that masks a miss?
const hasDefault = (line) => {
  if (/\bdefaultValue\s*:/.test(line)) return true;
  // t('key', 'fallback') — a string literal second argument.
  const m = line.match(
    /\bt\s*\(\s*(['"])((?:[^'\\]|\\.)*?)\1\s*,\s*(['"])((?:[^'\\]|\\.)*?)\3/,
  );
  if (m) return true;
  return false;
};

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const main = () => {
  const en = readEn();
  const addedKeys = keysAddedByDiff();
  const files = walkSourceFiles(SOURCE_DIRS).filter(
    (f) => !changedFiles || changedFiles.has(relative(repoRoot, f)),
  );

  const missing = [];
  const masked = [];
  let callCount = 0;

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(T_CALL_RE)) {
      const key = m[2];
      callCount++;
      const rel = relative(repoRoot, file);
      const at = `${rel}:${lineOf(text, m.index)}`;
      if (keyExists(en, key)) continue;
      // Satisfied by this diff adding the key (implementation round).
      if (addedKeys.has(key.split('.').pop())) continue;
      const entry = { key, at };
      if (hasDefault(text.slice(m.index, m.index + 400))) masked.push(entry);
      else missing.push(entry);
    }
  }

  const uniq = (list) => [
    ...new Map(list.map((e) => [`${e.key}@${e.at.split(':')[0]}`, e])).values(),
  ];
  const uMissing = uniq(missing);
  const uMasked = uniq(masked);

  if (uMissing.length) {
    console.log(`\nMissing i18n keys (no defaultValue) — ${uMissing.length}:`);
    for (const e of uMissing) console.log(`  ${e.key}  @ ${e.at}`);
  }
  if (uMasked.length && !strict) {
    console.log(
      `\nMasked i18n key misses (defaultValue present) — ${uMasked.length} (warnings):`,
    );
    for (const e of uMasked.slice(0, 20)) console.log(`  ${e.key}  @ ${e.at}`);
    if (uMasked.length > 20) console.log(`  …and ${uMasked.length - 20} more`);
  }

  const scope = diffBase ? ` vs ${diffBase}` : '';
  console.log(
    `\ni18n usage: ${strict ? 'strict' : 'report'} mode${scope}, ` +
      `${callCount} literal t() calls, ${uMissing.length} blocking, ${uMasked.length} masked.`,
  );

  if (strict && uMissing.length) process.exit(1);
};

main();
