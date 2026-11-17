#!/usr/bin/env node

/**
 * Issue-reference check.
 *
 * The issue flow keeps an issue open until QA on main confirms the merged
 * change, so PRs and commits must reference issues with `References #N` and
 * never with an auto-close keyword (`Fixes` / `Closes` / `Resolves`), which
 * would close the issue the moment the PR merges.
 *
 * Usage:
 *   node scripts/check-pr-references.mjs            # check the last commit message
 *   node scripts/check-pr-references.mjs --file F   # check a PR body / markdown file
 *   cat pr-body.md | node scripts/check-pr-references.mjs --stdin
 *
 * Exits 1 if an auto-close keyword followed by an issue number is found.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const AUTO_CLOSE_RE =
  /\b(Fixes|fixes|Closes|closes|Resolves|resolves)\s+#([0-9]{1,6})/g;

const report = (label, text) => {
  const hits = [...text.matchAll(AUTO_CLOSE_RE)];
  if (!hits.length) {
    console.log(`${label}: OK (no auto-close keywords)`);
    return true;
  }
  for (const h of hits) {
    console.error(
      `${label}: auto-close keyword "${h[1]} #${h[2]}" — use "References #${h[2]}" instead.`,
    );
  }
  return false;
};

const main = () => {
  const args = process.argv.slice(2);
  let ok = true;

  const fileIdx = args.indexOf('--file');
  if (fileIdx >= 0) {
    const text = readFileSync(args[fileIdx + 1], 'utf8');
    ok = report('PR body', text) && ok;
  }

  if (args.includes('--stdin')) {
    ok = report('stdin', readFileSync(0, 'utf8')) && ok;
  }

  // Last commit message (default; the squashed single commit is what lands).
  const subject = execSync('git log -1 --pretty=format:%B', {
    encoding: 'utf-8',
  }).trim();
  ok = report('commit message', subject) && ok;

  if (!ok) {
    console.error(
      '\nReferences must use the form "References #N" so the issue flow can keep the issue open until QA on main.',
    );
    process.exit(1);
  }
};

main();
