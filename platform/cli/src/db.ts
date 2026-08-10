import { Command } from 'commander';
import { empty } from '@openpeepshq/core/db';

export const registerDbCommand = (program: Command) => {
  const db = program.command('db').description('Database maintenance');

  db.command('clear')
    .description('Clear database')
    .action(async () => {
      await empty();
    });
};
