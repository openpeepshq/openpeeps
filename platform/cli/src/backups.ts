import { Command } from 'commander';
import {
  createBackup,
  listAllBackups,
  restoreBackups,
} from '@openpeepshq/core/backups';

export const registerBackupsCommand = (program: Command) => {
  const backups = program
    .command('backups')
    .description('Manage backups');

  backups
    .command('create')
    .description('Create a backup')
    .action(async () => {
      await createBackupCommand();
    });

  backups
    .command('list')
    .description('List backups')
    .action(async () => {
      await listBackupsCommand();
    });

  backups
    .command('restore')
    .description('Restore backups from a path')
    .argument('[path]', 'Backup path')
    .option('-p, --path <path>', 'Backup path')
    .action(async (path: string | undefined, options) => {
      const resolvedPath = path ?? (options?.path as string | undefined);
      if (!resolvedPath) {
        console.log('Backup path is required.');
        process.exit(1);
      }
      await restoreBackupsCommand(resolvedPath);
    });
};

const createBackupCommand = async () => {
  const backupDir = await createBackup();
  console.log(`Backup created at ${backupDir}`);
};

const listBackupsCommand = async () => {
  const backups = await listAllBackups();
  console.log(backups.join('\n'));
};

const restoreBackupsCommand = async (path: string) => {
  await restoreBackups(path);
};
