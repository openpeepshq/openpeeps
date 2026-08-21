/**
 * Regenerates fixtures/backups/{default-install,public-community}.zip from
 * platform/web/public/template/test-backup.zip.
 *
 * Run from platform/tests: `pnpm run fixtures:generate-backups`
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '../..');
const templateZip = path.join(
  repoRoot,
  'platform/web/public/template/test-backup.zip',
);
const outDir = path.join(root, 'fixtures/backups');

/** Legacy Arango JSONL template; omit databaseType so restore treats it as Arango. */
const fixtureMetadata = {
  config: { hostname: 'magicfactory.ap.social' },
};

const publicCaps = {
  none: { add: ['core-groups-read', 'core-posts-read'] },
  local: {
    add: [
      'core-groups-join',
      'core-posts-react',
      'core-posts-reply',
      'core-posts-rsvp',
      'core-posts-vote',
    ],
  },
  member: {
    add: [
      'core-posts-create-*',
      'core-posts-reply',
      'core-posts-rsvp',
      'core-posts-vote',
    ],
    remove: ['core-posts-create-event'],
  },
  moderator: { add: ['core-posts-*'] },
  admin: {
    add: [
      'core-posts-*',
      'core-groups-read',
      'core-groups-update',
      'core-groups-join',
      'core-groups-leave',
      'core-groups-addMember',
      'core-groups-removeMember',
      'core-groups-changeMemberRole',
    ],
  },
  owner: { add: ['core-posts-*', 'core-groups-*'] },
};

const privateCaps = {
  member: {
    add: [
      'core-groups-read',
      'core-posts-read',
      'core-posts-create-*',
      'core-posts-react',
      'core-posts-reply',
      'core-posts-rsvp',
      'core-posts-vote',
    ],
  },
  moderator: { add: ['core-posts-*'] },
  admin: {
    add: [
      'core-posts-*',
      'core-groups-read',
      'core-groups-update',
      'core-groups-join',
      'core-groups-leave',
      'core-groups-addMember',
      'core-groups-removeMember',
      'core-groups-changeMemberRole',
    ],
  },
  owner: { add: ['core-posts-*', 'core-groups-*'] },
};

const lockedCaps = {
  none: { add: ['core-groups-read', 'core-posts-read', 'core-posts-react'] },
  member: { add: ['core-posts-reply', 'core-posts-rsvp', 'core-posts-vote'] },
  moderator: { add: ['core-posts-*'] },
  admin: {
    add: [
      'core-posts-*',
      'core-groups-read',
      'core-groups-update',
      'core-groups-join',
      'core-groups-leave',
      'core-groups-addMember',
      'core-groups-removeMember',
      'core-groups-changeMemberRole',
    ],
  },
  owner: { add: ['core-posts-*', 'core-groups-*'] },
};

const capabilitiesForGroup = (group) => {
  if (group.capabilities) return group.capabilities;
  if (group.discoverable) {
    return group.locked ? lockedCaps : publicCaps;
  }
  return privateCaps;
};

const applyGroupCapabilities = async (dir) => {
  const groupsPath = path.join(dir, 'collections/groups.jsonl');
  const groups = (await readFile(groupsPath, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((group) => ({
      ...group,
      capabilities: capabilitiesForGroup(group),
      displayName: String(group.displayName || group.handle).slice(0, 30),
    }));
  await writeFile(
    groupsPath,
    `${groups.map((row) => JSON.stringify(row)).join('\n')}\n`,
  );
};

const writeZipFromDir = (dir, outZip) => {
  execFileSync('zip', ['-qr', outZip, '.'], { cwd: dir });
};

const unpackTemplate = async (dir) => {
  execFileSync('unzip', ['-q', templateZip, '-d', dir]);
  await writeFile(
    path.join(dir, 'metadata.json'),
    `${JSON.stringify(fixtureMetadata, null, 2)}\n`,
  );
};

const defaultTmp = await mkdtemp(path.join(tmpdir(), 'op-default-backup-'));
try {
  await unpackTemplate(defaultTmp);
  await applyGroupCapabilities(defaultTmp);
  writeZipFromDir(defaultTmp, path.join(outDir, 'default-install.zip'));
} finally {
  await rm(defaultTmp, { recursive: true, force: true });
}

const publicTmp = await mkdtemp(path.join(tmpdir(), 'op-public-backup-'));
try {
  await unpackTemplate(publicTmp);
  await applyGroupCapabilities(publicTmp);

  const configsPath = path.join(publicTmp, 'collections/configs.jsonl');
  const configs = (await readFile(configsPath, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((row) => {
      // Runtime loaders use openpeeps-* keys (legacy Arango used allpeep-*).
      const key =
        typeof row._key === 'string' && row._key.startsWith('allpeep-')
          ? `openpeeps-${row._key.slice('allpeep-'.length)}`
          : row._key;
      const base = {
        ...row,
        _key: key,
        ...(typeof row._id === 'string' && row._id.startsWith('configs/')
          ? { _id: `configs/${key}` }
          : {}),
      };
      if (key === 'openpeeps-community' || row._key === 'allpeep-community') {
        return {
          ...base,
          config: {
            ...row.config,
            info: {
              ...row.config?.info,
              name: 'Public Test Community',
              tagLine: 'Public community fixture',
            },
          },
        };
      }
      if (key === 'openpeeps-core' || row._key === 'allpeep-core') {
        return {
          ...base,
          config: {
            ...row.config,
            server: {
              ...row.config?.server,
              publicContent: true,
              signUpsOpen: true,
            },
          },
        };
      }
      return base;
    });
  await writeFile(
    configsPath,
    `${configs.map((row) => JSON.stringify(row)).join('\n')}\n`,
  );

  writeZipFromDir(publicTmp, path.join(outDir, 'public-community.zip'));
} finally {
  await rm(publicTmp, { recursive: true, force: true });
}

console.log(
  'Wrote fixtures/backups/default-install.zip and public-community.zip',
);
