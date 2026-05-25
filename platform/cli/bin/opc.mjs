#!/usr/bin/env node

// Resolve the compiled CLI relative to this script so the binary works even
// when invoked from a package that does not list `@openpeeps/cli` in its
// dependency closure (e.g. `platform/app` in the production Docker image).
import { cli } from '../dist/index.js';

await cli();
