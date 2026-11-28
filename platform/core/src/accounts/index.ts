import { Account } from '@openpeepshq/common/types';
import { compare } from 'bcrypt';

export { accountsMapping } from './mapping';
export { sendEmailValidationMail } from './helpers';
export * from './mutations';
export * from './finders';
export * from './rehash';
export * from './export';
export * from './exportStore';
export * from './exportJob';

export const checkPassword = async (account: Account, password: string) =>
  compare(password, account.passwordHash);
