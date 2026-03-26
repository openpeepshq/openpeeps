import { randomBytes } from 'crypto';
import { Command } from 'commander';
import { createAccount, listAccounts } from '@openpeeps/core/accounts';

export const registerAccountsCommand = (program: Command) => {
  const accounts = program
    .command('accounts')
    .description('Manage accounts');

  accounts
    .command('create')
    .description('Create an account')
    .requiredOption('-e, --email <email>', 'Account email')
    .option('-u, --handle <handle>', 'Profile handle')
    .option('-p, --password <password>', 'Account password')
    .option('-v, --email-validated', 'Mark email as validated')
    .action(async (options) => {
      const {
        email,
        handle,
        password,
        emailValidated,
      } = options as {
        email: string;
        handle: string;
        password?: string;
        emailValidated?: boolean;
      };
      await createAccountCommand({
        email,
        handle,
        password,
        emailValidated,
      });
    });

  accounts
    .command('list')
    .description('List accounts')
    .action(async () => {
      await listAccountsCommand();
    });
};

const createAccountCommand = async ({
  email,
  handle,
  password,
  emailValidated,
}: {
  email: string;
  handle: string;
  password?: string;
  emailValidated?: boolean;
}) => {
  const resolvedPassword =
    password ?? randomBytes(24).toString('base64url');

  if (!email) {
    console.log('Email is required.');
    process.exit(1);
  }

  const { account } = await createAccount({
    email,
    password: resolvedPassword,
    emailValidated,
    profile: {
      handle,
    },
  });
  if (account) {
    console.log(`Account created: ${account.email}`);
  }
};

const listAccountsCommand = async () => {
  console.log(JSON.stringify(await listAccounts(), null, 4));
};
