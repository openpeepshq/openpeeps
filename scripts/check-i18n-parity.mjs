// Locale parity check for the i18next resources in platform/i18n/src/locales.
//
// Compares every non-English locale against en.json (the source of truth) and
// reports missing keys, empty values, structural mismatches and i18next
// {{placeholder}} drift.
//
//   node scripts/check-i18n-parity.mjs            # report only, always exits 0
//   node scripts/check-i18n-parity.mjs --strict   # exit 1 on blocking defects
//
// Blocking in strict mode: missing keys, empty values, structural mismatches.
// Placeholder drift is reported but never blocks: fixing it needs a human
// judgement call about grammar (see events.feed.empty).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'platform',
  'i18n',
  'src',
  'locales',
);
const SOURCE_LOCALE = 'en';

const strict = process.argv.includes('--strict');

const isBranch = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readLocale = (locale) =>
  JSON.parse(readFileSync(join(LOCALES_DIR, `${locale}.json`), 'utf8'));

// Leaf paths -> value, and every path -> kind, so structure can be compared.
const collect = (
  value,
  prefix = [],
  leaves = new Map(),
  shapes = new Map(),
) => {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix.length ? `${prefix.join('.')}.${key}` : key;
    if (isBranch(child)) {
      shapes.set(path, 'object');
      collect(child, [...prefix, key], leaves, shapes);
    } else {
      shapes.set(path, Array.isArray(child) ? 'array' : typeof child);
      leaves.set(path, child);
    }
  }
  return { leaves, shapes };
};

const placeholders = (value) =>
  typeof value === 'string'
    ? new Set(
        [...value.matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/g)].map(
          (match) => match[1],
        ),
      )
    : new Set();

const sameSet = (a, b) =>
  a.size === b.size && [...a].every((item) => b.has(item));

const source = readLocale(SOURCE_LOCALE);
const { leaves: sourceLeaves, shapes: sourceShapes } = collect(source);

const locales = readFileSync(join(LOCALES_DIR, '..', 'index.ts'), 'utf8')
  .match(/import\s+\w+\s+from\s+'\.\/locales\/(\w+)\.json'/g)
  .map((line) => line.match(/locales\/(\w+)\.json/)[1])
  .filter((locale) => locale !== SOURCE_LOCALE);

if (!locales.length) {
  console.error(
    `No locales besides "${SOURCE_LOCALE}" found in platform/i18n/src/index.ts`,
  );
  process.exit(1);
}

let blocking = 0;
let warnings = 0;

for (const locale of locales) {
  const data = readLocale(locale);
  const { leaves, shapes } = collect(data);

  const missing = [...sourceLeaves.keys()].filter((path) => !leaves.has(path));
  const orphan = [...leaves.keys()].filter((path) => !sourceLeaves.has(path));
  const empty = [...leaves.entries()]
    .filter(
      ([path, value]) =>
        sourceLeaves.has(path) &&
        typeof value === 'string' &&
        value.trim() === '',
    )
    .map(([path]) => path);
  const structural = [...sourceShapes.keys()].filter(
    (path) => shapes.has(path) && sourceShapes.get(path) !== shapes.get(path),
  );
  const drift = [...sourceLeaves.keys()]
    .filter((path) => leaves.has(path))
    .filter(
      (path) =>
        !sameSet(
          placeholders(sourceLeaves.get(path)),
          placeholders(leaves.get(path)),
        ),
    )
    .map((path) => ({
      path,
      source: [...placeholders(sourceLeaves.get(path))].join(', ') || '-',
      target: [...placeholders(leaves.get(path))].join(', ') || '-',
    }));

  const localeBlocking = missing.length + empty.length + structural.length;
  blocking += localeBlocking;
  warnings += drift.length + orphan.length;

  const status = localeBlocking === 0 ? 'OK' : 'INCOMPLETE';
  console.log(
    `[${status}] ${locale}: ${leaves.size}/${sourceLeaves.size} keys` +
      ` | missing ${missing.length} | empty ${empty.length} | structure ${structural.length}` +
      ` | placeholders ${drift.length} | orphan ${orphan.length}`,
  );

  const show = (label, items) => {
    if (!items.length) return;
    console.log(`  ${label} (${items.length}):`);
    items.slice(0, 15).forEach((item) => console.log(`    ${item}`));
    if (items.length > 15) console.log(`    ... ${items.length - 15} more`);
  };
  show('missing', missing);
  show('empty', empty);
  show('structure mismatch', structural);
  drift.forEach(({ path, source: s, target: t }) =>
    console.log(`  placeholder ${path}: en {${s}} vs ${locale} {${t}}`),
  );
  orphan
    .slice(0, 10)
    .forEach((path) =>
      console.log(`  orphan (not in ${SOURCE_LOCALE}): ${path}`),
    );

  if (!localeBlocking)
    console.log(`  ${locale} covers every ${SOURCE_LOCALE} key.`);
  else if (!strict)
    console.log(`  ${locale} is incomplete; pass --strict to enforce.`);
}

if (strict && blocking) {
  console.error(
    `\ni18n parity: ${blocking} blocking defect(s). Add the translations before merging.`,
  );
  process.exit(1);
}
console.log(
  `\ni18n parity: ${strict ? 'strict' : 'report'} mode, ${blocking} blocking, ${warnings} warning(s).`,
);
