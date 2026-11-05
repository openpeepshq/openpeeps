#!/usr/bin/env node
// Report English leaves that appear 4+ times and the pass-1 common.* target.
//
//   node scripts/i18n-duplicate-report.mjs
//
// Homographs and values whose German translations already diverge stay local.
// Schema-bound configuration.* and emails.* keys are listed as aliases but
// are not retargeted in platform code (see platform/i18n/docs/cull-after-app-rollout.md).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'platform',
  'i18n',
  'src',
  'locales',
);

const isBranch = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const collect = (value, prefix = [], leaves = new Map()) => {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix.length ? `${prefix.join('.')}.${key}` : key;
    if (isBranch(child)) collect(child, [...prefix, key], leaves);
    else leaves.set(path, child);
  }
  return leaves;
};

/** Exact English value → canonical key. Omitted = keep local. */
export const CANONICAL_BY_ENGLISH = {
  Cancel: 'common.actions.cancel',
  Remove: 'common.actions.remove',
  Save: 'common.actions.save',
  Delete: 'common.actions.delete',
  Back: 'common.actions.back',
  Add: 'common.actions.add',
  Close: 'common.actions.close',
  Confirm: 'common.actions.confirm',
  Create: 'common.actions.create',
  Edit: 'common.actions.edit',
  Refresh: 'common.actions.refresh',
  Email: 'common.labels.email',
  Description: 'common.labels.description',
  Name: 'common.labels.name',
  Handle: 'common.labels.handle',
  Date: 'common.labels.date',
  Visibility: 'common.labels.visibility',
  Link: 'common.labels.link',
  'Alt Text': 'common.labels.altText',
  'Loading…': 'common.states.loading',
  Never: 'common.states.never',
  Posts: 'common.nav.posts',
  Groups: 'common.nav.groups',
  Members: 'common.nav.members',
  Events: 'common.nav.events',
  Bookmarks: 'common.nav.bookmarks',
};

/** Same English, different meaning — do not share. */
const KEEP_LOCAL = new Set([
  'All',
  'Public',
  'Private',
  'Community',
  'Post',
  'Reply',
  'Continue',
  'Reposts',
  'Reactions',
  'Replies',
  'Participants',
  'Followers',
  'Join Jam',
  'Leave Jam',
  'All dates in the series',
  'Click here to visit the group and manage your membership',
  'View event',
  'No groups available',
]);

/** German already diverges; do not retarget this alias. */
export const SKIP_RETARGET = new Set(['admin.backups.loading']);

const en = JSON.parse(readFileSync(join(LOCALES_DIR, 'en.json'), 'utf8'));
const leaves = collect(en);

const byValue = new Map();
for (const [path, value] of leaves) {
  if (typeof value !== 'string') continue;
  const text = value.trim();
  if (!byValue.has(text)) byValue.set(text, []);
  byValue.get(text).push(path);
}

const rows = [...byValue.entries()]
  .filter(([, paths]) => paths.length >= 4)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

console.log(
  `${rows.length} English values appear 4+ times (${leaves.size} leaves).\n`,
);

for (const [value, paths] of rows) {
  const canonical = CANONICAL_BY_ENGLISH[value];
  const reason = canonical
    ? `canonical ${canonical}`
    : KEEP_LOCAL.has(value)
      ? 'keep local (homograph / context / German drift)'
      : 'keep local (not classified for common.*)';
  console.log(`[${paths.length}] ${JSON.stringify(value)} — ${reason}`);
  for (const path of paths) {
    const skip = SKIP_RETARGET.has(path) ? ' (skip retarget)' : '';
    const bound =
      path.startsWith('configuration.') || path.startsWith('emails.')
        ? ' (schema/email — do not retarget)'
        : '';
    console.log(`  ${path}${skip}${bound}`);
  }
  console.log('');
}
