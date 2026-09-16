/**
 * Regenerates fixtures/backups/{default-install,public-community}.zip from
 * platform/web/public/template/test-backup.zip (Postgres JSONL).
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
  const body = group.body && typeof group.body === 'object' ? group.body : {};
  if (body.capabilities) return undefined;
  if (group.discoverable ?? body.discoverable) {
    return group.locked ?? body.locked ? lockedCaps : publicCaps;
  }
  return privateCaps;
};

const applyGroupCapabilities = async (dir) => {
  const groupsPath = path.join(dir, 'collections/groups.jsonl');
  const groups = (await readFile(groupsPath, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((group) => {
      const capabilities = capabilitiesForGroup(group);
      const displayName = String(
        group.displayName || group.body?.displayName || group.handle || '',
      ).slice(0, 30);
      if (!capabilities) {
        return displayName
          ? {
              ...group,
              displayName: group.displayName || displayName,
              body: { ...group.body, displayName },
            }
          : group;
      }
      return {
        ...group,
        capabilities,
        displayName: group.displayName || displayName,
        body: {
          ...group.body,
          capabilities,
          displayName,
        },
      };
    });
  await writeFile(
    groupsPath,
    `${groups.map((row) => JSON.stringify(row)).join('\n')}\n`,
  );
};

const writeZipFromDir = async (dir, outZip) => {
  await rm(outZip, { force: true });
  execFileSync('zip', ['-qr', outZip, '.'], { cwd: dir });
};

const unpackTemplate = async (dir) => {
  execFileSync('unzip', ['-q', templateZip, '-d', dir]);
};

const defaultTmp = await mkdtemp(path.join(tmpdir(), 'op-default-backup-'));
try {
  await unpackTemplate(defaultTmp);
  await applyGroupCapabilities(defaultTmp);
  await writeZipFromDir(defaultTmp, path.join(outDir, 'default-install.zip'));
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
      if (row.key === 'openpeeps-community') {
        return {
          ...row,
          body: {
            ...row.body,
            info: {
              ...row.body?.info,
              name: 'Public Test Community',
              tagLine: 'Public community fixture',
            },
          },
        };
      }
      if (row.key === 'openpeeps-core') {
        return {
          ...row,
          body: {
            ...row.body,
            server: {
              ...row.body?.server,
              publicContent: true,
              signUpsOpen: true,
            },
          },
        };
      }
      return row;
    });
  await writeFile(
    configsPath,
    `${configs.map((row) => JSON.stringify(row)).join('\n')}\n`,
  );

  await writeZipFromDir(publicTmp, path.join(outDir, 'public-community.zip'));
} finally {
  await rm(publicTmp, { recursive: true, force: true });
}

console.log(
  'Wrote fixtures/backups/default-install.zip and public-community.zip',
);
