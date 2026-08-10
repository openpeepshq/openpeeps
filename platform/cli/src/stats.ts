import { Command } from 'commander';
import { serverCounts } from '@openpeepshq/core/stats';

export const registerStatsCommand = (program: Command) => {
  const stats = program.command('stats').description('Server stats');

  stats
    .command('current')
    .description('Print current server stats as JSON')
    .action(async () => {
      console.log(JSON.stringify(await serverCounts(), null, 2));
    });
};
