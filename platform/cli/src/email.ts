import { Command } from 'commander';
import { queueTestEmail } from '@openpeepshq/core/email';

export const registerEmailCommand = (program: Command) => {
  const email = program.command('email').description('Email utilities');

  email
    .command('test')
    .description('Send a test email')
    .argument('[email]', 'Recipient email address')
    .option('-e, --email <email>', 'Recipient email address')
    .action(async (recipient: string | undefined, options) => {
      const resolvedEmail =
        recipient ?? (options?.email as string | undefined);
      await testEmail(resolvedEmail || '');
    });
};

const testEmail = async (email: string) => {
  if (!email) {
    console.log('Email is required.');
    process.exit(1);
  }

  try {
    console.log(`Sending test email to ${email}...`);
    await queueTestEmail(email);
    console.log('✅ Email queued successfully!');
    console.log('Note: The email has been added to the queue. Check your email service logs to confirm delivery.');
  } catch (error) {
    console.error('❌ Failed to queue email:', error);
    process.exit(1);
  }
};
