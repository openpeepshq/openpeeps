import { z } from 'zod';

export const handleRegexBase = '[a-zA-Z0-9_-]{1,16}';

export const handleRegex = new RegExp(`^${handleRegexBase}$`);

export const HANDLE_RESERVED_MESSAGE = 'Handle is reserved';

/**
 * Platform routes and system names. Always reserved. Community config can add
 * names, but these stay in code so an admin cannot delete them.
 */
export const forbiddenHandles = [
  'admin',
  'allpeep',
  'api',
  'app',
  'auth',
  'config',
  'core',
  'db',
  'email',
  'federation',
  'jam',
  'media',
  'network',
  'plugins',
  'undefined',
  'jamStarted',
  'jamSpeaker',
  'jamModerator',
  'new',
];

const defaultForbiddenHandles = new Set(
  forbiddenHandles.map((handle) => handle.toLowerCase()),
);

export const normalizeForbiddenHandle = (value: string) =>
  value.trim().toLowerCase();

export const isDefaultForbiddenHandle = (value: string) =>
  defaultForbiddenHandles.has(normalizeForbiddenHandle(value));

/** Exact username match, case-insensitive. `additional` is the community list. */
export const isForbiddenHandle = (
  value: string,
  additional?: readonly string[],
) => {
  const normalized = normalizeForbiddenHandle(value);
  if (!normalized) return false;
  if (defaultForbiddenHandles.has(normalized)) return true;
  return (additional ?? []).some(
    (entry) => normalizeForbiddenHandle(entry) === normalized,
  );
};

export type AdditionalForbiddenHandleIssue =
  | 'empty'
  | 'invalid'
  | 'builtIn'
  | 'duplicate';

export const classifyAdditionalForbiddenHandle = (
  raw: string,
  existing: readonly string[] = [],
): AdditionalForbiddenHandleIssue | null => {
  const value = normalizeForbiddenHandle(raw);
  if (!value) return 'empty';
  if (!handleRegex.test(value)) return 'invalid';
  if (isDefaultForbiddenHandle(value)) return 'builtIn';
  if (existing.some((entry) => normalizeForbiddenHandle(entry) === value)) {
    return 'duplicate';
  }
  return null;
};

/**
 * Community-added names only. Built-in names, blanks, duplicates, and values
 * that can never match a handle are dropped so they cannot be stored or deleted.
 */
export const collectAdditionalForbiddenHandles = (
  values: readonly string[],
) => {
  const issues: {
    index: number;
    issue: Extract<AdditionalForbiddenHandleIssue, 'empty' | 'invalid'>;
  }[] = [];
  const handles: string[] = [];
  values.forEach((raw, index) => {
    const issue = classifyAdditionalForbiddenHandle(raw, handles);
    if (issue === 'empty' || issue === 'invalid') {
      issues.push({ index, issue });
      return;
    }
    if (issue) return;
    handles.push(normalizeForbiddenHandle(raw));
  });
  return { handles, issues };
};

/** Stored as given. PATCH normalizes before save; reads stay a plain string list. */
export const additionalForbiddenHandlesSchema = z.array(z.string());
