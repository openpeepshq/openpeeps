import path from 'node:path';
import { fileURLToPath } from 'node:url';

const helpersRoot = path.dirname(fileURLToPath(import.meta.url));

export const fixturesDir = path.resolve(helpersRoot, '../fixtures');

export const backupFixturePath = (
  name: 'default-install' | 'public-community',
) => path.join(fixturesDir, 'backups', `${name}.zip`);

export const restoreBackupFixture = async (
  name: 'default-install' | 'public-community',
) => {
  const fixturePath = backupFixturePath(name);
  const { restoreBackups } = await import('@openpeepshq/core/backups');
  await restoreBackups(fixturePath);
};
