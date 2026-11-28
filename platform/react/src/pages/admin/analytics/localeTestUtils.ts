import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Shared locale-file reader for the admin analytics tests that pin copy
// (see the test files' headers for why each reads en or both locales).
export const readLocale = (name: 'en' | 'de'): Record<string, unknown> =>
  JSON.parse(
    readFileSync(
      resolve(__dirname, '../../../../../i18n/src/locales', `${name}.json`),
      'utf8',
    ),
  ) as Record<string, unknown>;

export const lookup = (
  locale: Record<string, unknown>,
  key: string,
): string | null => {
  let cur: unknown = locale;
  for (const part of key.split('.')) {
    cur =
      cur && typeof cur === 'object'
        ? (cur as Record<string, unknown>)[part]
        : undefined;
  }
  return typeof cur === 'string' && cur !== '' ? cur : null;
};
