#!/usr/bin/env node

// Resolve the compiled CLI relative to this script so the binary works even
// when invoked from a package that does not list `@openpeepshq/cli` in its
// dependency closure (e.g. the production Docker image).
//
// `secrets create-jwt-secret` must not import the full CLI: that pulls
// @openpeepshq/core config, which refuses to load in production without
// JWT_SECRET — the catch-22 for minting that secret on first boot.
import { createJwtSecret } from './createJwtSecret.mjs';

const args = process.argv.slice(2);
if (args[0] === 'secrets' && args[1] === 'create-jwt-secret') {
  process.stdout.write(`${createJwtSecret()}\n`);
  process.exit(0);
}

import('../dist/index.js')
  .then(({ cli }) => cli())
  // Avoid top-level `await`: commander action handlers commonly call
  // `process.exit()` before the awaited promise settles, which makes Node 22+
  // log "Detected unsettled top-level await" warnings.
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
