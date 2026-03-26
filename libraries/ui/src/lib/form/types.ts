import type { HTMLOptionAttributes } from 'svelte/elements';
import type { Readable } from 'svelte/store';
import type { ZodType } from 'zod';

export interface FormMessage {
  severity: 'info' | 'error' | 'warning';
  text: string;
}

export type FormMessages = Record<string, FormMessage[]>;

export interface FormContext<T> {
  schema?: ZodType<T>;
  messagesStore: Readable<FormMessages>;
  data: T;
  validate: () => void | Promise<void>;
  valid: boolean;
}

export type OptionData = HTMLOptionAttributes & { label: string };