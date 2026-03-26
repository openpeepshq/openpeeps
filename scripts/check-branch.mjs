#!/usr/bin/env node

/**
 * Pre-merge / PR checks:
 * 1. CHANGELOG.md matches the output of generate-changelog
 * 2. Only one commit ahead of main (single-commit branch)
 * 3. Last commit message conforms to conventional commit format
 *
 * Usage: node scripts/check-branch.mjs
 * Base branch: main (override with DEFAULT_BRANCH env).
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { generateChangelog, parseCommitMessage } from './generate-changelog.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md');
const DEFAULT_BRANCH = process.env.DEFAULT_BRANCH || 'main';

function runGit(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (e) {
    return null;
  }
}

function checkChangelogCurrent() {
  const expected = generateChangelog();
  if (!fs.existsSync(CHANGELOG_PATH)) {
    console.error('Check failed: CHANGELOG.md does not exist.');
    return false;
  }
  const actual = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  if (actual !== expected) {
    console.error('Check failed: CHANGELOG.md is not current with generate-changelog output.');
    console.error('Run: node scripts/generate-changelog.mjs');
    return false;
  }
  return true;
}

function checkSingleCommitAheadOfMain() {
  const base = DEFAULT_BRANCH;
  const count = runGit(`git rev-list --count ${base}..HEAD`);
  if (count === null) {
    console.error(`Check failed: could not compare to ${base} (branch may not exist).`);
    return false;
  }
  const n = parseInt(count, 10);
  if (n !== 1) {
    console.error(`Check failed: branch has ${n} commit(s) ahead of ${base}; expected exactly 1.`);
    return false;
  }
  return true;
}

function checkConventionalCommit() {
  const subject = runGit('git log -1 --pretty=format:%s');
  if (subject === null || subject === '') {
    console.error('Check failed: could not get last commit message.');
    return false;
  }
  const parsed = parseCommitMessage(subject);
  if (!parsed) {
    console.error('Check failed: last commit message does not follow conventional commit format.');
    console.error('Expected: <type>(<scope>): <description>');
    console.error('Example: feat(api): add user endpoint');
    console.error(`Got: ${subject}`);
    return false;
  }
  return true;
}

function main() {
  let ok = true;
  if (!checkChangelogCurrent()) ok = false;
  if (!checkSingleCommitAheadOfMain()) ok = false;
  if (!checkConventionalCommit()) ok = false;
  if (ok) {
    console.log('All checks passed.');
  }
  process.exit(ok ? 0 : 1);
}

main();
