#!/usr/bin/env node

// Resolve the compiled CLI relative to this script so the binary works even
// when invoked from a package that does not list `@openpeeps/cli` in its
// dependency closure (e.g. the production Docker image).
import { cli } from '../dist/index.js';

// Avoid top-level `await`: commander action handlers commonly call
// `process.exit()` before the awaited promise settles, which makes Node 22+
// log "Detected unsettled top-level await" warnings. Using `.then().catch()`
// keeps the same lifecycle without tripping that detector.
cli().catch((error) => {
  console.error(error);
  process.exit(1);
});
