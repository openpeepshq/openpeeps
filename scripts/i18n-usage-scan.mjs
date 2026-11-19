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
//   node scripts/i18n-usage-scan.mjs --dead-keys  # list keys nothing references
//
// --diff is the implementation-round mode: it flags a key your diff
// introduced that does not exist in en.json (or was added by the same diff —
// see below), so a new string you forgot to add to the locale files is
// caught before push. In --diff mode, keys present in the diff's added
// en.json lines are treated as satisfied. --diff's added-key match is a
// HEURISTIC: it compares the reference against the final key segment only
// (an added `"add":` under ANY subtree satisfies a reference to
// `other.add`). The authoritative missing-key gate is the strict scan
// WITHOUT --diff; --diff only narrows the advisory surface to this round.
//
// --dead-keys is the blind spot this scan otherwise cannot see: it lists
// en.json keys that NO code references. The missing-key half above only
// catches keys code asks for that the locale lacks — a key nothing asks for
// passes every gate (parity is happy both ways) and silently rots. It is
// report-only and NEVER exits 1 (even with --strict, which gates the
// missing-key half only): the list is advisory (the repo carries
// legacy keys and template-literal lookups are data-driven), so it must not
// gate merges. It scans every i18n-consuming platform dir and treats a key
// as referenced when its exact dot path appears as a string literal (data-
// driven lookup tables) or under a t(`…`) template-literal prefix (including
// the fallback form t(expr ?? `prefix.${x}`) — but only when that fallback
// expression carries no nested parentheses: `t(fn(x) ?? \`prefix.${x}\`)` is
// a KNOWN MISS the self-test pins, reported dead by design, because the
// detector is conservative and a future widening of the template regex must
// break that pin deliberately). A fully dynamic template
// (`t(`${dynamicVar}.tail`)`, empty prefix) is resolved against the
// dot-path string literals already collected, so
// `i18nPrefix="foo.bar"` + `t(`${i18nPrefix}.tail`)` marks `foo.bar.tail`
// live; when the interpolation comes after the dot
// (`t(`${statePrefix}.${state}`)`), a literal stem
// (`stateI18nPrefix="foo.bar"`) marks every `foo.bar.*` leaf live — but
// only for stems whose subtree carries no literal `t('stem.…')` reference:
// a stem that also has literal calls (e.g. `settings.accessTokens`) is not
// a pure dynamic consumer, and applying the rule to it would cross-product
// every scanned literal stem against every leaf and hide orphans. Keys
// kept live only by this stem heuristic are reported in their own
// `--dead-keys` section (unverified — verify or prune), mirroring the
// masked section, so a heuristic miss stays visible for adjudication
// instead of silently vanishing.
// Detection is deliberately conservative — a false negative (keeping a dead
// key) is far cheaper than a false positive (flagging a live key).
// A key resolved at runtime from a plain string VARIABLE is a known miss the
// detector cannot see by design: no literal or template prefix exists in
// source to match against (t(variable), or a dot path carried in a variable —
// the API-error mapper t(candidate) where candidate is a runtime errorKey is
// exactly this class, and it is why the seed mask entry exists — see the
// sidecar's reason, which cross-references it). The nested-paren fallback
// form pinned by the self-test is the template-literal half of this same
// class; a key only reachable this way must be masked, never assumed live.
// Masked entries live in the sidecar scripts/i18n-dead-key-mask.json so a
// reviewer can PR a mask change without touching this script; keep entries
// as exact dot paths and prune them once the key is removed from en.json.
// An entry may scope its suppression to the package(s) where the ambiguity
// lives ({ "key": ["dir", …] }): a run whose scanned dirs do not include the
// ambiguity's package reports the key as a plain orphan instead of silently
// suppressing it, so a global mask can no longer swallow a reference a
// non-scan package introduced. The top level must be a plain object; a
// top-level array or string is a wrong shape, not a syntax error, and the
// loader throws on it (flattening it would fabricate bogus '0'/'1'/…
// entries).
// Self-test: node scripts/i18n-usage-scan.mjs --self-test
//   (builds a temp fixture, asserts the detector finds the known dead key
//    and does not flag the live/templated/plural/data-driven/underscore
//    ones, that the nested-paren fallback form stays a known miss, that a
//    scoped mask entry is honored only while its package is in the scanned
//    dirs, that a reference outside the scanned primary dir flips the
//    verdict, that walkSourceFiles still skips node_modules/dist at every
//    depth (their dotted literals must not keep fixture keys live), and
//    that loadDeadKeyMask parses every documented sidecar
//    entry form — object with dirs → scoped, object without dirs /
//    plain string → unscoped, bare array → scoped — resolves a missing
//    sidecar to an empty mask (the documented "no mask" contract that
//    permits the file to be absent), and throws on a
//    corrupt file (bad syntax OR valid-JSON-wrong-shape top level) instead
//    of degrading to "no mask"; also spawns the script with --dead-keys on
//    the fixture tree to pin the exit-code discipline: 0 even when dead keys
//    exist, with all three report sections printed, regardless of --strict).

import { execSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES_DIR = join(repoRoot, 'platform', 'i18n', 'src', 'locales');

// The missing-key half and the --dead-keys half do NOT scan the same dirs —
// intentionally (they diverged; do not "fix" one to match the other). The
// missing-key half scans ONLY these: platform/client/src is in both because
// it is an SDK consumer that resolves keys at runtime (e.g. API error
// mapping). DEAD_KEY_DIRS below adds the server-side packages, and the
// PRACTICAL CONSEQUENCE is real: a t() key MISSING from en.json inside one of
// the dead-key-only dirs is invisible to the strict missing-key gate (that
// dir is not scanned there) — adding those dirs to the strict scan is a
// behavior change of the gate, out of scope for the Test/Doc/Quality round
// that added --dead-keys, and must be a deliberate follow-up.
const SOURCE_DIRS = [
  'platform/react/src',
  'platform/rn-components/src',
  'platform/client/src',
];
// --dead-keys walks every dir that can resolve a key at runtime, not just the
// dirs the missing-key half cares about: server (emails, error copy) and core
// (i18n) consume keys too, and platform/web holds the data-driven navigation
// tables. common/src produces errorKey dot paths (eventWaitlist) that reach
// users through t(errorKey) at the API-error mapper, so its literals are
// references too. See the SOURCE_DIRS comment for what this asymmetry means
// for the strict missing-key gate.
const DEAD_KEY_DIRS = [
  ...SOURCE_DIRS,
  'platform/common/src',
  'platform/server/src',
  'platform/core/src',
  'platform/cli/src',
  'platform/mcp/src',
  'platform/web/src',
];

// Human-adjudicated --dead-keys suppressions, loaded from a sidecar JSON file
// (config-over-code: PR a mask change without editing this script; a missing
// file means "no mask", the same as an empty one). Entry shape: {
// "key.dot.path": { "reason": "…", "dirs": ["dir", …] } } — the optional dirs
// scope the suppression to packages; omitting dirs (or the bare-array form
// ["dir", …]) means unscoped = suppress everywhere. A corrupt file must fail
// loudly (throw), never degrade to "no mask".
// A scoped entry is honored while at least one of its dirs matches a scanned
// dir under the package-dir rule (dirMatches, below) — that helper is the
// single definition of the scoping rule, so it must not be re-implemented
// elsewhere in this script or re-stated in the sidecar's docs.
// Seed it only for keys whose status a review has explicitly called ambiguous.
// error.emailAlreadyTaken is a documented orphan awaiting a delete-or-prefix
// decision: the only consumer that would translate it, the API-error mapper,
// requires the `error.` prefix — and core raises the *unprefixed* form
// ('emailAlreadyTaken', platform/core/src/accounts/mutations.ts:83,197), so
// nothing references the prefixed key AND nothing can reach it. The
// convention-in-play candidate is the UNPREFIXED form (reachable the moment
// core prefixes its errorKey; the register handler's
// auth.register.emailAlreadyTaken is the other half of that pattern, a
// server message the client maps through t(raw) in registerErrorCopy).
// Fixing core's errorKey would be a behavior change, out of scope for this
// Test/Doc/Quality round — the mask is the interim home. Scoped to the
// packages that resolve this error path (core, server): a literal
// t('error.emailAlreadyTaken') anywhere else must still surface.
// admin.database.cancel-style genuine debt stays unmasked so the report keeps
// surfacing it.
const DEAD_KEY_MASK_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  'i18n-dead-key-mask.json',
);
const loadDeadKeyMask = (path = DEAD_KEY_MASK_FILE) => {
  const mask = new Map();
  let raw = {};
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err; // a corrupt sidecar must fail loudly
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new RangeError(
      `dead-key mask sidecar must be a JSON object, got ${Array.isArray(raw) ? 'an array' : typeof raw}`,
    );
  }
  for (const [key, value] of Object.entries(raw)) {
    // The sidecar documents the object form { reason, dirs }; keep accepting
    // the bare-array form (scoped) and a plain string (unscoped) so a mask
    // change never requires two files to move together.
    const dirs = Array.isArray(value)
      ? value
      : value && Array.isArray(value.dirs)
        ? value.dirs
        : null;
    mask.set(key, dirs);
  }
  return mask;
};
const DEAD_KEY_MASK = loadDeadKeyMask();

// Package-dir rule for a scoped mask entry: a scope dir and a scanned dir
// match when they are identical or when one is a subdirectory of the other
// (a scope on platform/core/src covers a scan of platform/core/src/lib, and
// a scan of platform/ would cover a scope on platform/core/src). Single
// definition — isMasked applies it, the self-test pins it through the calls
// it makes into findDeadKeys, and the sidecar docs cross-reference it.
const dirMatches = (a, b) =>
  a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const deadKeys = args.includes('--dead-keys');
const selfTest = args.includes('--self-test');
const diffIdx = args.indexOf('--diff');
const diffBase = diffIdx >= 0 ? args[diffIdx + 1] || 'main' : null;
// The self-test's exit-code pin spawns this script against its temp fixture;
// the env vars pass the fixture's locale file, scanned dirs, and mask file
// into the child without adding user-facing flags.
const SELF_TEST_LOCALES = process.env.I18N_SCAN_SELF_TEST_LOCALES || null;
const SELF_TEST_DIRS = process.env.I18N_SCAN_SELF_TEST_DIRS || null;
const SELF_TEST_MASK = process.env.I18N_SCAN_SELF_TEST_MASK || null;

// ---------- en.json key resolution ----------

const readEn = () => {
  const file = SELF_TEST_LOCALES
    ? join(SELF_TEST_LOCALES, 'en.json')
    : join(LOCALES_DIR, 'en.json');
  return JSON.parse(readFileSync(file, 'utf8'));
};

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
const PLURAL_SUFFIXES = ['_one', '_other', '_0', '_1', '_2', '_few', '_many'];
const keyExists = (en, raw) => {
  if (typeof resolveKey(en, raw) === 'string') return true;
  for (const suffix of PLURAL_SUFFIXES) {
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
      // Scoped to the key fragment, not the full path: an added `"add":`
      // under any subtree satisfies `common.add` — advisory only, the
      // strict scan remains the gate.
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
      if (st.isDirectory()) {
        // Dependency and build dirs are skipped at EVERY depth: their sources
        // are full of dotted literals that would mask real dead keys, and a
        // package may carry its own node_modules/dist inside the scanned tree.
        if (name === 'node_modules' || name === 'dist') continue;
        walk(p);
      } else if (/\.(ts|tsx|js|jsx)$/.test(name) && !name.endsWith('.d.ts'))
        files.push(p);
    }
  };
  for (const r of roots) walk(isAbsolute(r) ? r : join(repoRoot, r));
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

// ---------- dead-key detection (--dead-keys) ----------

// Flatten a locale object to its leaf-string dot paths.
const flattenLeaves = (node, prefix, out) => {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flattenLeaves(value, path, out);
    else out.push(path);
  }
  return out;
};

// A key is "referenced" when:
//  - its exact dot path appears as a string literal anywhere (data-driven
//    lookup tables like `backups: 'navigation.backups'` in platform/web), or
//  - it appears under a `t(`...`)` template-literal prefix (dynamic suffixes
//    like `t(`settings.theme.${option}.mode`)` — including fallback form
//    `t(expr ?? `prefix.${x}`)` when the fallback expression has no nested
//    parens; `t(fn(x) ?? `prefix.${x}`)` is a known miss, pinned by the
//    self-test, see the script header), or
//  - it is the dot-prefix plus static suffix of a fully dynamic template
//    (`t(`.${suffix}`)`) and the dot-prefix also appears as a string literal
//    (e.g. `i18nPrefix="capabilities.relations"`), so
//    `capabilities.relations.stateHint` is recognized as live, or
//  - a fully dynamic template interpolates after the dot
//    (`t(`${statePrefix}.${state}`)`) and the key's stem (leaf minus its
//    final segment) is a scanned dot literal
//    (`stateI18nPrefix="groups.capabilities.state"`), so
//    `groups.capabilities.state.none` and siblings are recognized as live,
//    or
//  - a plural base key that code references carries a matching _one/_other
//    suffix on it.
// Keys in `mask` are human-adjudicated suppressions: counted separately and
// left out of the dead list, so genuine debt is not buried under entries a
// review has already classified. An entry maps to null (suppress everywhere)
// or to an array of dirs that scope the suppression to those packages
// (see isMasked); the sidecar file is the only place entries are defined.
const findDeadKeys = (en, dirs, mask = DEAD_KEY_MASK) => {
  const leaves = flattenLeaves(en, '', []);
  const files = walkSourceFiles(dirs);
  const literalKeys = new Set();
  // Exact dot paths passed as the first arg of a t('a.b') call (any dir):
  // the stem rule (below) applies only to stems whose subtree has no such
  // literal reference — those subtrees are read through other means too,
  // so they are not pure dynamic consumers (narrowing that keeps the
  // cross-product from hiding orphans; see the stem rule's comment).
  const literalTKeys = new Set();
  const tplPrefixes = new Set();
  // Static tails of fully dynamic templates (empty prefix), resolved against
  // string literals below (literalPrefix + templateSuffix): `.foo` pins
  // `prefix.foo`. The double-dynamic form (`` `.${x}` ``, interpolation
  // after the dot) instead enables the stem rule below: a leaf is live when
  // its stem (leaf minus its final segment) is a scanned dot literal —
  // `stateI18nPrefix="foo.bar"` + `` t(`${statePrefix}.${state}`) `` marks
  // `foo.bar.*` leaves live (the same literal-match resolution, one level
  // deeper, so unrelated same-stem keys stay dead).
  const tplTails = new Set();
  // Set when any scanned file has the double-dynamic form
  // `` t(`${var}.${x}`) `` (interpolation after the dot) — see the comment
  // above for what it enables. A Set of file paths (not a boolean) so the
  // rule can later narrow to stems whose own file co-occurs with the
  // template; kept conservative (any scanned file's stem is a candidate).
  const dynamicTailTplFiles = new Set();
  // Any multi-segment dot identifier used as a string literal — superset of
  // t('a.b') keys that also covers data-driven lookup-table entries. The
  // leading character allows an underscore (a valid i18n key start); the
  // dot-path SHAPE (at least two segments) is what excludes plain words.
  const strLitRe = /(['"`])([A-Za-z_][A-Za-z0-9]*(?:\.[A-Za-z0-9_$]+)+)\1/g;
  // Template literal that is the first argument to `t(`. The non-paren run
  // between `(` and the backtick covers fallback form `t(expr ?? `…`)`.
  const tplRe = /\bt\s*\(([^()]*?)`([^`]*)`/g;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const fileLiterals = new Set();
    for (const m of text.matchAll(strLitRe)) fileLiterals.add(m[2]);
    for (const m of text.matchAll(tplRe)) {
      const body = m[2];
      const i = body.indexOf('${');
      const prefix = i < 0 ? body : body.slice(0, i);
      if (prefix) tplPrefixes.add(prefix);
      else {
        // Fully dynamic head: the tail after the first interpolation
        // (e.g. `${i18nPrefix}.stateHint` -> `.stateHint`) is resolved
        // against string literals, so a dot-prefix prop value marks it live.
        // When the interpolation comes after the dot
        // (`${statePrefix}.${state}`), the stem rule below applies: every
        // leaf whose stem (e.g. `groups.capabilities.state`, passed to the
        // template's consumers as a dot-literal prop) is a scanned literal
        // is live.
        const close = body.indexOf('}');
        if (close >= 0 && body[close + 1] === '.') {
          const tail = body.slice(close + 1);
          if (tail.indexOf('${') < 0) {
            tplTails.add(tail);
          } else if (/^\.\$\{[A-Za-z_$][A-Za-z0-9_$]*\}$/.test(tail)) {
            dynamicTailTplFiles.add(file);
          }
        }
      }
    }
    for (const lit of fileLiterals) literalKeys.add(lit);
    for (const m of text.matchAll(T_CALL_RE)) literalTKeys.add(m[2]);
  }
  // A mask entry either suppresses a key repo-wide (maps to null) or is
  // SCOPED to the package(s) where the ambiguity lives (maps to a dir list).
  // A scoped entry is honored only while at least one of its dirs is part of
  // this scan: a run that does not include the ambiguity's package cannot
  // verify that ambiguity, so it reports the key as a plain orphan instead of
  // silently swallowing it (a repo-global mask would stay broad forever).
  const isMasked = (leaf) => {
    if (!mask.has(leaf)) return false;
    const scope = mask.get(leaf);
    if (!Array.isArray(scope)) return true; // unscoped entry suppresses everywhere
    return scope.some((sd) => dirs.some((d) => dirMatches(sd, d)));
  };
  // Leaves kept live only by the double-dynamic stem heuristic (no other
  // reference matched) — reported in their own section for adjudication.
  const stemHeuristic = new Set();
  const isReferenced = (leaf) => {
    if (literalKeys.has(leaf)) return true;
    for (const suffix of PLURAL_SUFFIXES) {
      if (
        leaf.endsWith(suffix) &&
        literalKeys.has(leaf.slice(0, -suffix.length))
      ) {
        return true;
      }
    }
    for (const prefix of tplPrefixes) if (leaf.startsWith(prefix)) return true;
    for (const tail of tplTails) {
      if (leaf.endsWith(tail) && literalKeys.has(leaf.slice(0, -tail.length)))
        return true;
    }
    // `${prefixVar}.${dynamicTail}`: live when the key's stem (leaf minus
    // its final segment) is a scanned dot literal — the static-tail
    // resolution one level deeper (conservative: only exact literals pin).
    // Narrowed to stems whose subtree has NO literal t('stem.…') reference:
    // `groups.capabilities.state` is read dynamically (its consumers pass
    // the stem as a prop), but e.g. `settings.accessTokens` has many
    // literal calls, so marking every `settings.accessTokens.*` leaf live
    // via any scanned stem would be a repo-global cross-product that hides
    // orphans. Such a stem is NOT a pure dynamic consumer.
    // When the stem rule is the ONLY reason a leaf is live, it is reported
    // in its own `stemHeuristic` section (kept off the dead list, unverified
    // — verify or prune) instead of vanishing silently.
    if (dynamicTailTplFiles.size) {
      const stem = leaf.slice(0, leaf.lastIndexOf('.'));
      if (stem && literalKeys.has(stem) && !subtreeHasLiteralT(stem)) {
        stemHeuristic.add(leaf);
        return true;
      }
    }
    return false;
  };
  const subtreeHasLiteralT = (stem) => {
    const withDot = `${stem}.`;
    for (const k of literalTKeys) if (k.startsWith(withDot)) return true;
    return false;
  };
  const unreferenced = leaves.filter((leaf) => !isReferenced(leaf));
  return {
    dead: unreferenced.filter((leaf) => !isMasked(leaf)).sort(),
    masked: unreferenced.filter((leaf) => isMasked(leaf)).sort(),
    stemHeuristic: [...stemHeuristic].sort(),
  };
};

const runSelfTest = () => {
  const base = mkdtempSync(join(tmpdir(), 'i18n-dead-keys-'));
  let selfTestChecks = 0; // every passing assertion increments this
  const localesDir = join(base, 'locales');
  const srcDir = join(base, 'src');
  mkdirSync(localesDir);
  mkdirSync(srcDir);
  writeFileSync(
    join(localesDir, 'en.json'),
    JSON.stringify(
      {
        common: { used: 'Live', deadKey: 'Orphaned' },
        templated: { alpha: 'A', beta: 'B' },
        vote: { count_one: 'one {{n}}', count_other: '{{n}} items' },
        navigation: { backups: 'Backups' },
        other: { flag: 'Flagged elsewhere' },
        // Point 1: reachable only via the fallback form `t(expr ?? \`prefix.${x}\`)`.
        analytics: { tabs: { overview: 'Overview', growth: 'Growth' } },
        // Point 2: `stateHint` reachable only via the empty-prefix template
        // `t(`.${tail}`)` + literal prefix; the double-dynamic twin
        // `t(`${statePrefix}.${state}`)` marks every leaf under the literal
        // stem `grp.state` live; `grp.other.none` (stem not a literal) is a
        // true orphan and must stay dead.
        caps: {
          relations: { stateHint: 'Hint' },
          orphan: 'Orphaned',
        },
        grp: {
          state: { none: 'None', specificAdd: 'Specific add' },
          // Point 3: a dot literal stem (below) with NO literal t() call in
          // its subtree — the stem rule keeps `name` off the dead list, but
          // only unverified: it must surface in the stemHeuristic section.
          tokens: { name: 'Stem-heuristic leaf' },
          other: { none: 'Orphaned' },
        },
        // Point 3 (collateral case): `solo.tokens` is ALSO a dot literal
        // stem, but its subtree HAS a literal t() call (maybeLive) — the
        // stem rule must not apply to it (a repo-global cross-product would
        // hide `name`), so `name` stays dead.
        solo: { tokens: { name: 'Cross-product orphan', maybeLive: 'Live' } },
        // Point 4: underscore-leading key — the literal detector must not
        // hard-exclude a valid key start character, so the t('internal.note')
        // reference below keeps this leaf live.
        internal: { note: 'Internal' },
        // Point 5: reachable ONLY via the nested-paren fallback form
        // `t(pick(tab) ?? \`fallback.deep.${x}\`)` — a KNOWN MISS pinned by
        // design: the prefix is not extracted, so the leaf must stay dead.
        // A future regex widening that starts covering it must break this
        // pin deliberately.
        fallback: { deep: { leaf: 'Nested-paren miss' } },
        // Point 6: the ONLY literal for this leaf lives inside the fixture's
        // node_modules/ and src/dist/ dirs — both skipped at every depth by
        // walkSourceFiles. If the skip regressed, the dependency/build
        // literal would keep the key live and the dead list would lose it.
        skipped: { alive: 'Skipped-dir literal' },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(srcDir, 'a.tsx'),
    [
      "t('common.used');",
      't(`templated.${x}`);',
      "t('vote.count', { count: n });",
      "const TABLE = { backups: 'navigation.backups' };",
      // Point 1: template literal is NOT the first arg to `t(` — a `??`
      // fallback precedes it. The prefix must still be extracted.
      't(tab.i18nKey ?? `analytics.tabs.${tab.slug}`);',
      // Point 2: fully dynamic head (empty prefix) + a dot-path string literal
      // elsewhere — the literal prefix + template tail marks it live.
      'const i18nPrefix = "caps.relations";',
      't(`${i18nPrefix}.stateHint`);',
      // Point 2 (double-dynamic): the interpolation comes after the dot;
      // the stem co-occurring with the template in this file marks every
      // grp.state.* leaf live.
      'const statePrefix = "grp.state";',
      't(`${statePrefix}.${state}`);',
      // Point 3: dot-literal stems for the stem-rule cases (no t() in the
      // grp.tokens subtree — pure dynamic consumer; solo.tokens has one).
      'const grpTokensPrefix = "grp.tokens";',
      'const soloTokensPrefix = "solo.tokens";',
      // Point 3 (collateral case): the literal t() call in the `solo.tokens`
      // subtree (to a sibling key) is what disqualifies that stem — without
      // the narrowing, the stem rule would cross-product the global
      // double-dynamic template against `solo.tokens` and hide `name`.
      "t('solo.tokens.maybeLive');",
      // Point 4: underscore-leading key — the literal detector must treat it
      // as a valid i18n key, so this reference keeps `internal.note` live.
      "t('internal.note');",
      // Point 5: nested-paren fallback form — the known miss pinned by
      // design: the `??` expression's parens break the non-paren run, so
      // the prefix is NOT extracted and fallback.deep.leaf stays dead.
      't(pick(tab) ?? `fallback.deep.${tab.slug}`);',
      '',
    ].join('\n'),
  );
  // A second dir holds a reference for one key but is NOT scanned below —
  // pins that detection only counts literals inside the scanned dirs (the
  // eventWaitlist class: add the dir or the report lies).
  const otherDir = join(base, 'other');
  mkdirSync(otherDir);
  writeFileSync(
    join(otherDir, 'b.ts'),
    ["export const KEY = 'other.flag';", ''].join('\n'),
  );
  // Point 6: dependency and build dirs INSIDE the scanned tree must be
  // skipped at every depth, not just at the top level — their dotted
  // literals would otherwise pollute the reference set. Both copies carry
  // the literal for `skipped.alive`: if the skip regressed, the key would
  // flip to referenced and the expectDead assertion below fails.
  for (const dir of [
    join(srcDir, 'node_modules', 'dep'),
    join(srcDir, 'dist', 'nested'),
  ]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'dep.js'),
      ["t('skipped.alive');", "const K = 'skipped.alive';", ''].join('\n'),
    );
  }
  const en = JSON.parse(readFileSync(join(localesDir, 'en.json'), 'utf8'));
  const dead = findDeadKeys(en, [srcDir]);
  const expectDead = (leaf, should) => {
    const has = dead.dead.includes(leaf) || dead.masked.includes(leaf);
    if (has !== should) {
      console.error(
        `self-test FAILED: ${leaf} expected ${should ? 'dead' : 'referenced'}, got ${has ? 'dead' : 'referenced'}`,
      );
      process.exit(1);
    }
    selfTestChecks += 1;
  };
  expectDead('common.used', false);
  expectDead('common.deadKey', true);
  expectDead('templated.alpha', false);
  expectDead('templated.beta', false);
  expectDead('vote.count_one', false);
  expectDead('vote.count_other', false);
  expectDead('navigation.backups', false);
  expectDead('other.flag', true);
  // Point 1: fallback form `t(expr ?? \`prefix.${x}\`)` still extracts the
  // prefix, so the dynamic-suffix keys are recognized (no false positives).
  expectDead('analytics.tabs.overview', false);
  expectDead('analytics.tabs.growth', false);
  // Point 2: empty-prefix template `t(`.${tail}`)` + literal prefix marks
  // the key live; the double-dynamic form `t(`${statePrefix}.${state}`)`
  // marks every leaf under the co-occurring literal stem live; a true
  // orphan (stem not a dot literal in any scanned file) stays dead.
  expectDead('caps.relations.stateHint', false);
  expectDead('caps.orphan', true);
  expectDead('grp.state.none', false);
  expectDead('grp.state.specificAdd', false);
  expectDead('grp.other.none', true);
  // Point 3 (collateral case): `solo.tokens` is a scanned literal stem, but
  // its subtree carries a literal t() call, so the stem rule must not apply
  // (a repo-global cross-product would hide `solo.tokens.name`); without
  // the narrowing the leaf would be falsely kept live. The subtree call to
  // `maybeLive` is itself a genuine reference and must not be flagged.
  expectDead('solo.tokens.name', true);
  expectDead('solo.tokens.maybeLive', false);
  expectDead('grp.tokens.name', false);
  // Point 4: an underscore-leading key is a valid i18n key — its literal
  // reference must keep it live (the detector must not hard-exclude a valid
  // key start character).
  expectDead('internal.note', false);
  // Point 5: the nested-paren fallback form is a KNOWN MISS pinned by
  // design — the template-prefix regex cannot span the `pick(tab)` parens,
  // so the leaf must be reported dead. A future regex that starts covering
  // this shape must break this pin on purpose, not silently.
  expectDead('fallback.deep.leaf', true);
  // Point 6: node_modules/ and src/dist/ inside the scanned tree are
  // skipped at every depth — the `skipped.alive` literals placed there are
  // not references, so the key must stay reported dead (regressing to a
  // top-level-only skip, or dropping the skip, would keep it live).
  expectDead('skipped.alive', true);
  // Point 3 (heuristic section): a leaf kept live ONLY by the stem rule
  // must surface in its own section, not vanish silently. The grp.state.*
  // twins are stem-heuristic-only too — the same class as the real
  // groups.capabilities.state.* keys, which the section exists to expose.
  for (const leaf of [
    'grp.state.none',
    'grp.state.specificAdd',
    'grp.tokens.name',
  ]) {
    if (!dead.stemHeuristic.includes(leaf)) {
      console.error(
        `self-test FAILED: ${leaf} not reported in stemHeuristic section`,
      );
      process.exit(1);
    }
    selfTestChecks += 1;
  }
  for (const leaf of ['caps.relations.stateHint', 'solo.tokens.maybeLive']) {
    if (dead.stemHeuristic.includes(leaf)) {
      console.error(
        `self-test FAILED: ${leaf} reported in stemHeuristic section though it is not stem-heuristic-only`,
      );
      process.exit(1);
    }
    selfTestChecks += 1;
  }
  // Unscoped mask entry: suppressed everywhere it is dead.
  const deadWithMask = findDeadKeys(
    en,
    [srcDir],
    new Map([['other.flag', null]]),
  );
  if (deadWithMask.dead.includes('other.flag')) {
    console.error('self-test FAILED: masked key still reported as dead');
    process.exit(1);
  }
  if (!deadWithMask.masked.includes('other.flag')) {
    console.error('self-test FAILED: masked key not counted as masked');
    process.exit(1);
  }
  selfTestChecks += 1;
  // Scoped mask entry: honored while the scoped package is in the scanned
  // dirs (common.deadKey is unreferenced in srcDir, scope matches srcDir).
  const deadScoped = findDeadKeys(
    en,
    [srcDir],
    new Map([['common.deadKey', [srcDir]]]),
  );
  if (
    deadScoped.dead.includes('common.deadKey') ||
    !deadScoped.masked.includes('common.deadKey')
  ) {
    console.error(
      'self-test FAILED: scoped mask not honored while its package is scanned',
    );
    process.exit(1);
  }
  selfTestChecks += 1;
  // …but a run whose dirs do NOT include the ambiguity's package reports the
  // key as a plain orphan instead of silently swallowing it (otherDir holds
  // no reference to common.deadKey, and its scope is srcDir, not otherDir).
  const deadUnscoped = findDeadKeys(
    en,
    [otherDir],
    new Map([['common.deadKey', [srcDir]]]),
  );
  if (!deadUnscoped.dead.includes('common.deadKey')) {
    console.error(
      'self-test FAILED: scoped mask still suppressed outside its package',
    );
    process.exit(1);
  }
  selfTestChecks += 1;
  // loadDeadKeyMask — the sidecar parser — is the only code path that turns
  // the JSON file into the Map above; pinning it means the documented entry
  // forms cannot silently degrade to "suppress everywhere" (the object form
  // is what the committed sidecar uses).
  const maskFile = join(base, 'mask.json');
  writeFileSync(
    maskFile,
    JSON.stringify(
      {
        'obj.scoped': { reason: 'r', dirs: [srcDir] },
        'obj.unscoped': { reason: 'r' },
        'plain.unscoped': 'reason',
        'array.scoped': [srcDir],
      },
      null,
      2,
    ),
  );
  const parsedMask = loadDeadKeyMask(maskFile);
  const expectScope = (key, dirs) => {
    const got = parsedMask.get(key);
    const same = JSON.stringify(got ?? null) === JSON.stringify(dirs ?? null);
    if (!same) {
      console.error(
        `self-test FAILED: loadDeadKeyMask(${key}) scope ${JSON.stringify(got)}, expected ${JSON.stringify(dirs)}`,
      );
      process.exit(1);
    }
    selfTestChecks += 1;
  };
  expectScope('obj.scoped', [srcDir]);
  expectScope('array.scoped', [srcDir]);
  expectScope('obj.unscoped', null);
  expectScope('plain.unscoped', null);
  // A corrupt sidecar must throw loudly, never degrade to "no mask".
  writeFileSync(maskFile, '{ not json');
  let threw = false;
  try {
    loadDeadKeyMask(maskFile);
  } catch (err) {
    threw = true;
    if (!(err instanceof SyntaxError)) {
      console.error(
        `self-test FAILED: corrupt sidecar threw ${err.constructor.name}, expected SyntaxError`,
      );
      process.exit(1);
    }
  }
  if (!threw) {
    console.error(
      'self-test FAILED: corrupt sidecar did not throw (degraded to no mask)',
    );
    process.exit(1);
  }
  selfTestChecks += 1;
  // Valid-JSON-wrong-shape is equally a corrupt sidecar: a top-level array
  // or string would flatten into bogus '0'/'1'/… entries, so it must throw
  // loudly too (fail-loudly contract, shape-complete).
  for (const bad of [JSON.stringify(['a.b']), '"just a string"']) {
    writeFileSync(maskFile, bad);
    threw = false;
    try {
      loadDeadKeyMask(maskFile);
    } catch (err) {
      threw = err instanceof RangeError;
    }
    if (!threw) {
      console.error(
        `self-test FAILED: non-object sidecar ${bad} did not throw RangeError`,
      );
      process.exit(1);
    }
    selfTestChecks += 1;
  }
  // A missing sidecar is the documented "no mask" (the same as an empty
  // one) — the only contract that permits the file to be absent. Without
  // this pin, a future refactor that drops the ENOENT guard (tightening the
  // fail-loudly contract) would pass the self-test and only surface as an
  // unexplained i18n-check crash on a tree without the sidecar.
  const missingMask = loadDeadKeyMask(join(base, 'no-such-mask.json'));
  if (missingMask.size !== 0) {
    console.error(
      'self-test FAILED: missing sidecar did not resolve to an empty mask',
    );
    process.exit(1);
  }
  selfTestChecks += 1;
  // Exit-code discipline: a FULL --dead-keys run (the CLI path, including
  // main()'s process.exitCode handling) must exit 0 even when dead keys
  // exist, print all three report sections, and behave identically under
  // --strict (report-only gates only the missing-key half). findDeadKeys
  // is already pinned above; this pins the process-level contract a red
  // CI run would actually observe.
  const scriptPath = fileURLToPath(import.meta.url);
  // A fixture mask so the spawned run exercises the masked section too
  // (caps.orphan is dead in the fixture; the repo mask cannot see it).
  const fixtureMaskFile = join(base, 'fixture-mask.json');
  writeFileSync(
    fixtureMaskFile,
    JSON.stringify({ 'caps.orphan': { reason: 'exit-code pin' } }),
  );
  const spawnEnv = {
    ...process.env,
    I18N_SCAN_SELF_TEST_LOCALES: localesDir,
    I18N_SCAN_SELF_TEST_DIRS: srcDir,
    I18N_SCAN_SELF_TEST_MASK: fixtureMaskFile,
  };
  const fixtureReport = findDeadKeys(
    en,
    [srcDir],
    loadDeadKeyMask(fixtureMaskFile),
  );
  const counts = {
    dead: fixtureReport.dead.length,
    masked: fixtureReport.masked.length,
    stemHeuristic: fixtureReport.stemHeuristic.length,
  };
  for (const strictArg of [[''], ['--strict']]) {
    let out = '';
    try {
      out = execSync(
        `node ${JSON.stringify(scriptPath)} --dead-keys ${strictArg.join(' ')}`,
        { encoding: 'utf-8', cwd: base, env: spawnEnv },
      );
    } catch (err) {
      console.error(
        `self-test FAILED: --dead-keys run (exit ${err.status}) must exit 0 even with dead keys present`,
      );
      console.error(err.stdout);
      process.exit(1);
    }
    if (
      !out.includes('Unreferenced en.json keys') ||
      !out.includes(`: ${counts.dead}\n`)
    ) {
      console.error(
        'self-test FAILED: dead section not printed by the spawned run',
      );
      console.error(out);
      process.exit(1);
    }
    if (counts.masked && !out.includes('Masked dead-key entries')) {
      console.error(
        'self-test FAILED: masked section not printed by the spawned run',
      );
      console.error(out);
      process.exit(1);
    }
    if (counts.stemHeuristic && !out.includes('stem heuristic')) {
      console.error(
        'self-test FAILED: stem-heuristic section not printed by the spawned run',
      );
      console.error(out);
      process.exit(1);
    }
    selfTestChecks += 1;
  }
  rmSync(base, { recursive: true, force: true });
  console.log(`i18n dead-key self-test: passed (${selfTestChecks} checks)`);
};

// ---------- missing-key scan ----------

// Shared by the CLI --dead-keys run and the self-test's exit-code pin:
// prints the three report sections and returns their counts. It never sets
// process.exitCode — the "NEVER exits 1" discipline is enforced here in ONE
// place so both callers (and the pin) share the contract.
const printDeadKeysReport = ({ dead, masked, stemHeuristic }) => {
  if (dead.length) {
    console.log(
      `\nUnreferenced en.json keys (warnings — nothing references these;` +
        `\nreport-only, never a gate failure): ${dead.length}\n`,
    );
    for (const key of dead) console.log(`  ${key}`);
  } else {
    console.log('\nUnreferenced en.json keys: none.');
  }
  if (stemHeuristic.length) {
    console.log(
      `\nLive via the double-dynamic stem heuristic (unverified — verify or ` +
        `prune; kept off the dead list while the stem rule covers them, ` +
        `${stemHeuristic.length}; see the stem rule in this script):`,
    );
    for (const key of stemHeuristic) console.log(`  ${key}`);
  }
  if (masked.length) {
    console.log(
      `\nMasked dead-key entries (human-adjudicated, kept off the report — ` +
        `${masked.length}; see scripts/i18n-dead-key-mask.json). These are ` +
        `ambiguous/unresolved by human review, not proven live — the mask ` +
        `suppresses the flag, it is not a reference finding:\n`,
    );
    for (const key of masked) console.log(`  ${key}`);
  }
  return {
    dead: dead.length,
    masked: masked.length,
    stemHeuristic: stemHeuristic.length,
  };
};

const main = () => {
  if (selfTest) {
    runSelfTest();
    return;
  }
  if (deadKeys) {
    const en = readEn();
    const dirs = SELF_TEST_DIRS
      ? SELF_TEST_DIRS.split(':').filter(Boolean)
      : DEAD_KEY_DIRS;
    const mask = SELF_TEST_MASK
      ? loadDeadKeyMask(SELF_TEST_MASK)
      : DEAD_KEY_MASK;
    printDeadKeysReport(findDeadKeys(en, dirs, mask));
    return;
  }

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
