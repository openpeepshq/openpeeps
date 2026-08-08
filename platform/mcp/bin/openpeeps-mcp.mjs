#!/usr/bin/env node

import { runStdio } from '../dist/stdio.js';

runStdio().catch((error) => {
  console.error(error);
  process.exit(1);
});
