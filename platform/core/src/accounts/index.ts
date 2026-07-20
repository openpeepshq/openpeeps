import { Account } from '@openpeeps/common/types';
import { compare } from 'bcrypt';

export { accountsMapping } from './mapping';
export { sendEmailValidationMail } from './helpers';
export * from './mutations';
export * from './finders';

export const checkPassword = async (account: Account, password: string) =>
  compare(password, account.passwordHash);
