import type { OptionHTMLAttributes } from 'react';
import type { ZodType } from 'zod';

export interface FormMessage {
  severity: 'info' | 'error' | 'warning';
  text: string;
}

export type FormMessages = Record<string, FormMessage[]>;

export interface FormContextValue<T> {
  schema?: ZodType<T>;
  messagesStore: FormMessagesStore;
  data: T;
  validate: () => void | Promise<void>;
  valid: boolean;
}

export interface FormMessagesStore {
  get: () => FormMessages;
  subscribe: (listener: () => void) => () => void;
  set: (m: FormMessages) => void;
}

export type OptionData = OptionHTMLAttributes<HTMLOptionElement> & { label: string };
