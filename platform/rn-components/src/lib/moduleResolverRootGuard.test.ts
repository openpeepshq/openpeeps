import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Regression guard for the glob 9/10 -> 14.0.6 override (GHSA-3g3m-2fjr-6pw4,
 * issue #2255).
 *
 * babel-plugin-module-resolver reads glob through
 * `interopRequireDefault(require('glob')).default`. glob >= 10 (CJS) sets
 * `__esModule: true` but exports no `default`, so the plugin's
 * `normalizeRoot` (its `glob.default.hasMagic` / `glob.default.sync` calls)
 * throws `Cannot read properties of undefined` whenever module-resolver is
 * configured with a `root` option. The 14.0.6 override therefore makes a
 * module-resolver `root` option a hard crash. No first-party babel / metro /
 * bob config may pass `root` to that plugin, so this guard scans every such
 * config and fails the suite if any of them does.
 *
 * It intentionally does NOT evaluate the configs (they require their runtime
 * deps); it is a static source check. Detection is name-based, not
 * resolver-based: both the quoted (`'root'` / `"root"`) and unquoted
 * spellings of a top-level `root` key are handled, but only the textual
 * plugin-reference-followed-by-options shape is detectable — a `root`
 * passed through a variable or computed key would not be flagged.
 *
 * Name coverage: `babel.config.*`, `.babelrc*`, `metro.config.*`, and
 * `metro.js` (the plain-JS Metro filename used in-repo by
 * `platform/rn-components`) are all matched. `bob.config.*` currently
 * matches no file — bob 0.35.2 reads its config from the `package.json`
 * `bob` field — so that pattern is a placeholder, not a live detection.
 */

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'lib',
  'build',
  'coverage',
  '.next',
  '.turbo',
  'android',
  'ios',
]);

function isConfigName(name: string): boolean {
  return (
    name.startsWith('babel.config.') ||
    name === '.babelrc' ||
    name.startsWith('.babelrc.') ||
    name.startsWith('metro.config.') ||
    name === 'metro.js' ||
    name.startsWith('bob.config.')
  );
}

function collectConfigFiles(dir: string, found: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    // Do not follow symlinked dependency stores (pnpm).
    if (entry.isSymbolicLink()) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collectConfigFiles(p, found);
    } else if (entry.isFile() && isConfigName(entry.name)) {
      found.push(p);
    }
  }
}

/** Strip /* ... *\/ and // ... line comments so they can't match as code. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}

/**
 * Matches a module-resolver plugin reference, with or without a
 * require / require.resolve wrapper, e.g. `'module-resolver'`,
 * `"babel-plugin-module-resolver"`, or
 * `require.resolve('babel-plugin-module-resolver')`.
 */
const PLUGIN_REF =
  /(?:require\(\s*['"]|require\.resolve\(\s*['"])?(?:@?[\w.-]+\/)?(?:babel-plugin-)?module-resolver['"]?\s*\)?/g;

/** Return the balanced `{...}` options object that immediately follows a
 *  plugin reference (the `,{ ... }` after it), or null if there is none. */
function extractFollowingOptions(code: string, refEnd: number): string | null {
  const after = code.slice(refEnd);
  const comma = after.indexOf(',');
  if (comma === -1) return null;
  const seg = after.slice(comma + 1);
  const braceIdx = seg.indexOf('{');
  if (braceIdx === -1) return null;
  if (!/^\s*$/.test(seg.slice(0, braceIdx))) return null;
  const openIdx = comma + 1 + braceIdx;
  let depth = 0;
  for (let i = openIdx; i < after.length; i++) {
    if (after[i] === '{') depth++;
    else if (after[i] === '}') {
      depth--;
      if (depth === 0) return after.slice(openIdx, i + 1);
    }
  }
  return null;
}

/**
 * True if a top-level (depth 0) `root` key starts at `inner[i]` — the
 * unquoted or the quoted (`'root'` / `"root"`) spelling, in the colon form
 * (`root: …` / `"root": …`) or the unquoted shorthand form (`root,` /
 * `root }` / end). A key position is one whose previous non-whitespace
 * character is `{` or `,` (or the start of the body) — so a *value* named
 * `root` (after `:`) is never matched.
 */
function isRootKeyAt(inner: string, i: number): boolean {
  let isKeyStart = true;
  for (let j = i - 1; j >= 0; j--) {
    const ch = inner[j];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') continue;
    isKeyStart = ch === '{' || ch === ',';
    break;
  }
  if (!isKeyStart) return false;
  const c = inner[i];
  let end: number;
  if (c === '"' || c === "'") {
    if (!inner.startsWith(c + 'root' + c, i)) return false;
    end = i + 6; // quote + "root" + quote
  } else {
    if (c !== 'r' || !inner.startsWith('root', i)) return false;
    end = i + 4;
  }
  const rest = inner.slice(end);
  return /^\s*:/.test(rest) || /^\s*[,}]/.test(rest) || /^\s*$/.test(rest);
}

/**
 * True if `obj` (a `{...}` literal) has a top-level (depth 0) `root` key —
 * the colon form `{ root: ... }`, the quoted-key form `{ "root": ... }`
 * (as in a JSON `.babelrc`), or the shorthand `{ root }`. Nested
 * occurrences (e.g. `alias: { root: ... }`) do not count.
 */
function hasTopLevelRoot(obj: string): boolean {
  const inner = obj.slice(1, obj.length - 1);
  let depth = 0;
  let inStr: string | null = null;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (
      depth === 0 &&
      (c === 'r' || c === '"' || c === "'") &&
      isRootKeyAt(inner, i)
    ) {
      return true;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{' || c === '[') {
      depth++;
      continue;
    }
    if (c === '}' || c === ']') {
      depth--;
      continue;
    }
  }
  return false;
}

function moduleResolverHasRoot(code: string): boolean {
  PLUGIN_REF.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PLUGIN_REF.exec(code)) !== null) {
    const options = extractFollowingOptions(code, m.index + m[0].length);
    if (options && hasTopLevelRoot(options)) return true;
    if (m[0].length === 0) PLUGIN_REF.lastIndex++;
  }
  return false;
}

describe('module-resolver `root` regression guard (#2255 glob 14.0.6)', () => {
  it('discovers at least one first-party babel/metro/bob config (guard is active)', () => {
    const configs: string[] = [];
    collectConfigFiles(REPO_ROOT, configs);
    expect(configs.length).toBeGreaterThan(0);
  });

  it('no first-party babel/metro/bob config passes `root` to module-resolver', () => {
    const configs: string[] = [];
    collectConfigFiles(REPO_ROOT, configs);
    const violations = configs.filter((file) => {
      const src = readFileSync(file, 'utf8');
      return moduleResolverHasRoot(stripComments(src));
    });
    expect(violations).toEqual([]);
  });
});

describe('module-resolver `root` guard: scanner unit checks', () => {
  it('flags a top-level `root` key on a module-resolver options object', () => {
    const code = `plugins: [['module-resolver', { root: ['./src'], alias: { x: 'y' } }]]`;
    expect(moduleResolverHasRoot(stripComments(code))).toBe(true);
  });

  it('flags the require.resolve-wrapped reference with `root`', () => {
    const code = `plugins: [[require.resolve('babel-plugin-module-resolver'), { root: ['.'] }]]`;
    expect(moduleResolverHasRoot(stripComments(code))).toBe(true);
  });

  it('flags a single-quoted `root` key on a module-resolver options object', () => {
    const code = `plugins: [['module-resolver', { 'root': ['./src'], alias: { x: 'y' } }]]`;
    expect(moduleResolverHasRoot(stripComments(code))).toBe(true);
  });

  it('flags a double-quoted (JSON .babelrc) `root` key on a module-resolver options object', () => {
    const code = `plugins: [["module-resolver", { "root": "./src" }]]`;
    expect(moduleResolverHasRoot(stripComments(code))).toBe(true);
  });

  it('does not flag a module-resolver reference without `root`', () => {
    const code = `plugins: [['babel-plugin-module-resolver', { alias: { x: 'y' } }]]`;
    expect(moduleResolverHasRoot(stripComments(code))).toBe(false);
  });

  it('does not flag a value named `root` (a key, not a value)', () => {
    const code = `plugins: [['module-resolver', { x: 'root', alias: { x: 'y' } }]]`;
    expect(moduleResolverHasRoot(stripComments(code))).toBe(false);
  });

  it('does not flag a nested `root` (e.g. under `alias`)', () => {
    const code = `plugins: [['module-resolver', { alias: { root: './src' } }]]`;
    expect(moduleResolverHasRoot(stripComments(code))).toBe(false);
  });

  it('does not flag a module-resolver mention in a comment', () => {
    const code = `// module-resolver root: do not use\nplugins: []`;
    expect(moduleResolverHasRoot(stripComments(code))).toBe(false);
  });

  it('isConfigName: accepts the plain-JS `metro.js` filename, rejects near-misses', () => {
    expect(isConfigName('metro.js')).toBe(true);
    expect(isConfigName('metro.config.js')).toBe(true);
    expect(isConfigName('babel.config.cjs')).toBe(true);
    expect(isConfigName('bob.config.js')).toBe(true);
    expect(isConfigName('metro.js.map')).toBe(false);
    expect(isConfigName('x-metro.js')).toBe(false);
  });

  it('stripComments: drops `// module-resolver root: …` comment text', () => {
    const out = stripComments(
      "plugins: [] // module-resolver root: './src' would crash under glob 14\nx = 1"
    );
    expect(out).not.toContain('module-resolver');
    expect(out).not.toContain('would crash');
    expect(out).toContain('plugins: []');
    expect(out).toContain('x = 1');
  });

  it('stripComments: does not truncate URL-ish values (`//` after `:` or `\\`)', () => {
    const url = "url = 'https://openpeeps.org/docs/glob';";
    expect(stripComments(url)).toBe(url);
    const winPath = "root = 'c:\\//share';";
    expect(stripComments(winPath)).toBe(winPath);
  });
});
