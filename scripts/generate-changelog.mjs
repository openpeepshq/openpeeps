#!/usr/bin/env node

/**
 * Generates CHANGELOG.md from git commits following conventional commit standards
 * 
 * Conventional commit format: <type>(<scope>): <description>
 * 
 * Types:
 * - feat: A new feature
 * - fix: A bug fix
 * - docs: Documentation only changes
 * - style: Changes that do not affect the meaning of the code
 * - refactor: A code change that neither fixes a bug nor adds a feature
 * - perf: A code change that improves performance
 * - test: Adding missing tests or correcting existing tests
 * - chore: Changes to the build process or auxiliary tools
 * - ci: Changes to CI configuration files and scripts
 * - build: Changes that affect the build system or external dependencies
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md');
const RELEASE_TAG_PATTERN = /^(\d{4}-\d{2}-\d{2})-([0-9a-fA-F]+)-RELEASE$/;

// Conventional commit types and their display names
const COMMIT_TYPES = {
  feat: 'Features',
  fix: 'Bug Fixes',
  docs: 'Documentation',
  style: 'Style',
  refactor: 'Refactoring',
  perf: 'Performance',
  test: 'Tests',
  chore: 'Chores',
  ci: 'CI/CD',
  build: 'Build',
};


/** Parse conventional commit message; returns null if not conventional. */
export function parseCommitMessage(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  // Match conventional commit format: type(scope): description
  // Also handle breaking changes: type(scope)!: description or type!: description
  const conventionalPattern = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
  const match = message.trim().match(conventionalPattern);

  if (!match) {
    return null;
  }

  const [, type, scope, breaking, description] = match;
  return {
    type: type.toLowerCase(),
    scope: scope || null,
    breaking: !!breaking,
    description: description.trim(),
  };
}

function runGit(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error) {
    return '';
  }
}

function getReleaseTags() {
  const tags = runGit('git tag --list')
    .split('\n')
    .map(tag => tag.trim())
    .filter(Boolean)
    .map(tagName => {
      const match = tagName.match(RELEASE_TAG_PATTERN);
      if (!match) {
        return null;
      }
      return {
        name: tagName,
        date: match[1],
      };
    })
    .filter(Boolean);

  tags.sort((a, b) => {
    if (a.date === b.date) {
      return a.name.localeCompare(b.name);
    }
    return a.date.localeCompare(b.date);
  });

  return tags;
}

function getCommitsForRange(fromRef, toRef) {
  const range = fromRef ? `${fromRef}..${toRef}` : toRef;
  const output = runGit(`git log ${range} --pretty=format:"%H|%s" --no-merges`);
  if (!output) {
    return [];
  }
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

// Group commits by type
function groupCommits(commits) {
  const grouped = {};

  for (const commitLine of commits) {
    const parts = commitLine.split('|');
    const subject = parts[1] || parts[0] || '';
    const parsed = parseCommitMessage(subject);

    if (!parsed) {
      // Skip non-conventional commits
      continue;
    }

    const type = parsed.type;
    if (!COMMIT_TYPES[type]) {
      // Unknown type, skip or add to 'chore'
      continue;
    }

    if (!grouped[type]) {
      grouped[type] = [];
    }

    let entry = parsed.description;
    if (parsed.scope) {
      entry = `**${parsed.scope}**: ${entry}`;
    }
    if (parsed.breaking) {
      entry = `**BREAKING**: ${entry}`;
    }

    grouped[type].push(entry);
  }

  return grouped;
}

function renderSection(sectionTitle, groupedCommits) {
  let section = `## ${sectionTitle}\n\n`;
  // Add entries in order of importance
  const typeOrder = ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'ci', 'build', 'chore'];

  let hasEntries = false;
  for (const type of typeOrder) {
    if (groupedCommits[type] && groupedCommits[type].length > 0) {
      hasEntries = true;
      section += `### ${COMMIT_TYPES[type]}\n\n`;
      for (const entry of groupedCommits[type]) {
        section += `- ${entry}\n`;
      }
      section += '\n';
    }
  }

  if (!hasEntries) {
    section += '- No changes\n\n';
  }

  return section;
}

/** Generate changelog content (same as would be written to CHANGELOG.md). */
export function generateChangelog() {
  const releaseTags = getReleaseTags();
  let changelog = 'Changelog for OpenPeeps\n';
  changelog += '=======================\n\n';

  if (releaseTags.length === 0) {
    const currentCommits = getCommitsForRange(null, 'HEAD');
    changelog += renderSection('Current', groupCommits(currentCommits));
    return changelog;
  }

  const latestTag = releaseTags[releaseTags.length - 1];
  const currentCommits = getCommitsForRange(latestTag.name, 'HEAD');
  changelog += renderSection('Current', groupCommits(currentCommits));

  for (let i = releaseTags.length - 1; i >= 0; i -= 1) {
    const tag = releaseTags[i];
    const previousTag = i > 0 ? releaseTags[i - 1].name : null;
    const commits = getCommitsForRange(previousTag, tag.name);
    changelog += renderSection(tag.date, groupCommits(commits));
  }

  return changelog;
}

// Main function (when run directly)
function main() {
  const changelog = generateChangelog();

  fs.writeFileSync(CHANGELOG_PATH, changelog, 'utf-8');
  console.log('CHANGELOG.md regenerated successfully.');
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  main();
}
