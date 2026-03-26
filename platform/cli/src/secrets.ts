import { randomBytes } from 'crypto';
import { Command } from 'commander';

export const registerSecretsCommand = (program: Command) => {
  const secrets = program
    .command('secrets')
    .description('Generate secrets');

  secrets
    .command('create-jwt-secret')
    .description('Generate a JWT secret')
    .action(() => {
      console.log(randomBytes(64).toString('base64url'));
    });
};
