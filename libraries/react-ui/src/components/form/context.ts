import { createContext, useContext, useSyncExternalStore } from 'react';
import type { FormContextValue, FormMessages } from './types';

export const FormCtx = createContext<FormContextValue<unknown> | null>(null);

export function useFormContext<T = unknown>(): FormContextValue<T> {
  const ctx = useContext(FormCtx) as FormContextValue<T> | null;
  if (!ctx) {
    throw new Error(
      'useFormContext must be used inside a <Form> from @openpeepshq/react-ui.',
    );
  }
  return ctx;
}

/**
 * Subscribes to the current `FormMessages` snapshot for use inside
 * `FormInput` / `Label` (mirrors `$messagesStore` from the Svelte original).
 */
export function useFormMessages(): FormMessages {
  const ctx = useFormContext();
  return useSyncExternalStore(
    ctx.messagesStore.subscribe,
    ctx.messagesStore.get,
    ctx.messagesStore.get,
  );
}
