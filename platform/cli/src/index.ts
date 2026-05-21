import { Command } from 'commander';
import { closeQueues } from '@openpeeps/core/jobs';
import { registerAccountsCommand } from './accounts';
import { registerSecretsCommand } from './secrets';
import { registerEmailCommand } from './email';
import { registerDbCommand } from './db';
import { registerProfilesCommand } from './profiles';
import { registerBackupsCommand } from './backups';
import { registerJamsCommand } from './jams';
import { registerStatsCommand } from './stats';
import { registerCommunityConfigCommand } from './community-config';

export const cli = async () => {
  const program = new Command();

  program
    .name('openpeeps')
    .description('OpenPeeps CLI')
    .showHelpAfterError(true)
    .showSuggestionAfterError(true);

  registerAccountsCommand(program);
  registerProfilesCommand(program);
  registerSecretsCommand(program);
  registerEmailCommand(program);
  registerDbCommand(program);
  registerBackupsCommand(program);
  registerJamsCommand(program);
  registerStatsCommand(program);
  registerCommunityConfigCommand(program);

  try {
    await program.parseAsync(process.argv);
  } finally {
    await closeQueues().catch((error: unknown) => {
      console.error('Failed to close queue connections:', error);
    });
  }
};
