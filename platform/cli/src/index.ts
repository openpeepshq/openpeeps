import { Command } from 'commander';
import { registerAccountsCommand } from './accounts';
import { registerSecretsCommand } from './secrets';
import { registerEmailCommand } from './email';
import { registerDbCommand } from './db';
import { registerProfilesCommand } from './profiles';
import { registerBackupsCommand } from './backups';
import { registerJamsCommand } from './jams';

export const cli = async () => {
  const program = new Command();

  program
    .name('allpeep')
    .description('Allpeep CLI')
    .showHelpAfterError(true)
    .showSuggestionAfterError(true);

  registerAccountsCommand(program);
  registerProfilesCommand(program);
  registerSecretsCommand(program);
  registerEmailCommand(program);
  registerDbCommand(program);
  registerBackupsCommand(program);
  registerJamsCommand(program);

  await program.parseAsync(process.argv);
};
