import type { FormContext, FormMessages } from './types';
import { getContext, setContext } from 'svelte';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { z, type ZodError, type ZodType } from 'zod';

const CONTEXT_KEY = 'form-context';

export const initFormContext = <T>(initialContext: FormContext<T>) =>
	setContext<FormContext<T>>(CONTEXT_KEY, initialContext);

export const getFormContext = <T>() => getContext<FormContext<T>>(CONTEXT_KEY);

export const pathToString = (pathArray: (string | number)[]): string =>
	pathArray
		.map((element) => (typeof element === 'number' ? `[${element}]` : element))
		.join('.')
		.replaceAll('.[', '[');

export const zodErrorToFormMessages = (zodError: ZodError): FormMessages =>
	zodError.issues.reduce((messages: FormMessages, issue) => {
		const path = pathToString(issue.path);
		return {
			...messages,
			[path]: [...(messages[path] || []), { severity: 'error', text: issue.message }]
		};
	}, {});


export const isoDateToDatetimeLocal = (utcDate: string, timeZone: string) =>
	formatInTimeZone(utcDate, timeZone, "yyyy-MM-dd'T'HH:mm");

export const datetimeLocalToIsoDate = (datetimeLocal: string, timeZone: string) =>
	fromZonedTime(datetimeLocal, timeZone).toISOString();

export const getSchemaForPath = (schema: ZodType | undefined, path: (string | number)[]): ZodType | undefined =>
	schema && schema instanceof z.ZodObject ?
		path.length === 1 ? schema.shape[path[0]] :
			getSchemaForPath(schema.shape[path[0]], path.slice(1)) :
		undefined;

export const isRequired = (schema?: ZodType): boolean =>
	schema ? !schema.isOptional() : false