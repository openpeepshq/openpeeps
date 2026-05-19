import { deepmerge } from 'deepmerge-ts';
import { passwordPlaceHolder } from '@openpeeps/common/types';
import type {
  AdminEmailTestInput,
  CoreConfig,
} from '@openpeeps/common/types';
import { config } from '../config';
import { sendEmail } from './send';

const mergeEmailForTest = (
  base: CoreConfig['email'],
  override?: AdminEmailTestInput['email'],
): CoreConfig['email'] => {
  if (!override) {
    return base;
  }
  const merged = deepmerge(base, override) as CoreConfig['email'];
  const pass = override.transportConfig?.auth?.pass;
  if (pass === undefined || pass === '' || pass === passwordPlaceHolder) {
    merged.transportConfig = {
      ...merged.transportConfig,
      auth: {
        ...merged.transportConfig.auth,
        pass: base.transportConfig.auth?.pass,
      },
    };
  }
  return merged;
};

export const sendSmtpTestEmail = async (input: AdminEmailTestInput) => {
  const saved = await config();
  const emailSettings = mergeEmailForTest(saved.email, input.email);

  if (!emailSettings.defaultFrom?.trim()) {
    throw new Error('defaultFrom is required to send mail');
  }

  const draftConfig: CoreConfig = { ...saved, email: emailSettings };

  await sendEmail({ to: input.to, template: 'test' }, draftConfig, {
    renderLocally: true,
  });
};
