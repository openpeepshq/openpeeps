import { randomBytes } from 'crypto';
import { Command } from 'commander';

// Keep in sync with bin/createJwtSecret.mjs (opc short-circuits to that file
// before loading this module when minting without JWT_SECRET).
export const createJwtSecret = () => randomBytes(64).toString('base64url');

export const registerSecretsCommand = (program: Command) => {
  const secrets = program.command('secrets').description('Generate secrets');

  secrets
    .command('create-jwt-secret')
    .description('Generate a JWT secret')
    .action(() => {
      console.log(createJwtSecret());
    });
};
