#!/usr/bin/env node
/**
 * Rewrites SvelteKit/sveltekit-api specific imports inside `src/lib/handlers/**`
 * and `src/api/**` so each file is a valid `@openpeeps/server` module.
 *
 * - `$lib/server/api/errors`     → `#lib/errors`
 * - `$lib/server/api/sse`        → `#lib/sse`
 * - `$lib/server/api/handlers/*` → `#lib/handlers/*`
 * - `$lib/server/auth`           → `#lib/auth`
 * - `$lib/server/helpers`        → `#lib/helpers`
 * - `sveltekit-api`              → `#lib/endpoint`
 * - `@sveltejs/kit` (RequestEvent type only) → `@riddl/core`
 * - `event.locals.X`             → `event.context.X`
 * - `event.params.X`             → `(event as any).param?.X` (in code)
 * - `new Endpoint({ ... }).handle(` → `endpoint({ ... }).handle(`
 * - `export default new Endpoint(...)` → `export const apiEndpoint = endpoint(...)`
 */

import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const repoRoot = new URL('..', import.meta.url).pathname;

const targets = [
  join(repoRoot, 'src/lib/handlers'),
  join(repoRoot, 'src/api'),
];

const walk = (dir) => {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
};

const transforms = [
  // sveltekit-api → our endpoint wrapper
  [/from\s+['"]sveltekit-api['"]/g, "from '#lib/endpoint'"],
  // RequestEvent type from @sveltejs/kit → @riddl/core
  [/from\s+['"]@sveltejs\/kit['"]/g, "from '@riddl/core'"],

  // $lib paths → # aliases
  [/from\s+['"]\$lib\/server\/api\/errors(\/[^'"]*)?['"]/g, "from '#lib/errors'"],
  [/from\s+['"]\$lib\/server\/api\/sse(\/[^'"]*)?['"]/g, "from '#lib/sse'"],
  [/from\s+['"]\$lib\/server\/api\/handlers\/([^'"]+)['"]/g, "from '#lib/handlers/$1'"],
  [/from\s+['"]\$lib\/server\/api\/handlers['"]/g, "from '#lib/handlers'"],
  [/from\s+['"]\$lib\/server\/auth(\/[^'"]*)?['"]/g, "from '#lib/auth'"],
  [/from\s+['"]\$lib\/server\/helpers(\/[^'"]*)?['"]/g, "from '#lib/helpers'"],

  // event.locals.X → event.context.X
  [/event\.locals\./g, 'event.context.'],
  [/evt\.locals\./g, 'evt.context.'],

  // Endpoint -> endpoint (rewrite the named import). Match the full
  // braced specifier list, strip `Endpoint`, prepend `endpoint`, dedupe.
  [/import\s+\{([^}]+)\}\s+from\s+['"]#lib\/endpoint['"];?/g,
    (_, specifiers) => {
      const items = specifiers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => s !== 'Endpoint');
      const set = new Set(['endpoint', ...items]);
      return `import { ${[...set].join(', ')} } from '#lib/endpoint';`;
    },
  ],
  [/new\s+Endpoint\s*\(/g, 'endpoint('],
  [/export\s+default\s+endpoint\(/g, 'export const apiEndpoint = endpoint('],

  // event.params.X → (event as any).param.X (we can't always know, but param
  // destructuring works at runtime because our wrapper merges body+query+param
  // into the first handler arg)
  [/event\.params\b/g, '(event as any).param'],
  [/evt\.params\b/g, '(evt as any).param'],
];

let total = 0;
for (const target of targets) {
  const files = walk(target);
  for (const file of files) {
    const before = readFileSync(file, 'utf8');
    let after = before;
    for (const [pattern, replacement] of transforms) {
      after = after.replace(pattern, replacement);
    }
    if (after !== before) {
      writeFileSync(file, after);
      console.log('  ✓', relative(repoRoot, file));
      total++;
    }
  }
}

console.log(`\nTransformed ${total} file(s).`);
