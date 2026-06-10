import { z, type ZodError, type ZodType } from 'zod';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { FormMessages, FormMessagesStore } from './types';

export const pathToString = (pathArray: (string | number)[]): string =>
  pathArray
    .map((element) => (typeof element === 'number' ? `[${element}]` : element))
    .join('.')
    .replaceAll('.[', '[');

export const zodErrorToFormMessages = (zodError: ZodError): FormMessages =>
  zodError.issues.reduce<FormMessages>((messages, issue) => {
    const path = pathToString(issue.path as (string | number)[]);
    return {
      ...messages,
      [path]: [
        ...(messages[path] || []),
        { severity: 'error', text: issue.message },
      ],
    };
  }, {});

export const isoDateToDatetimeLocal = (utcDate: string, timeZone: string): string =>
  formatInTimeZone(utcDate, timeZone, "yyyy-MM-dd'T'HH:mm");

export const datetimeLocalToIsoDate = (datetimeLocal: string, timeZone: string): string =>
  fromZonedTime(datetimeLocal, timeZone).toISOString();

export const getSchemaForPath = (
  schema: ZodType | undefined,
  path: (string | number)[],
): ZodType | undefined => {
  if (!schema || !(schema instanceof z.ZodObject)) return undefined;
  const shape = schema.shape as Record<string, ZodType>;
  if (path.length === 1) return shape[path[0] as string];
  return getSchemaForPath(shape[path[0] as string], path.slice(1));
};

export const isRequired = (schema?: ZodType): boolean =>
  schema ? !schema.isOptional() : false;

export const createMessagesStore = (initial: FormMessages = {}): FormMessagesStore => {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next) => {
      value = next;
      listeners.forEach((l) => l());
    },
  };
};
