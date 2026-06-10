import * as React from 'react';
import { Info } from 'lucide-react';
import type { ZodType } from 'zod';
import { cn } from '@/lib/utils';
import {
  createMessagesStore,
  zodErrorToFormMessages,
} from './helpers';
import { FormCtx } from './context';
import type { FormContextValue, FormMessage, FormMessages } from './types';

export interface FormProps<T> {
  data: T;
  schema?: ZodType<T>;
  validator?: (data: T) => FormMessages;
  onSubmit?: (data: T) => void | Promise<void>;
  onChange?: (data: T) => void;
  onPreValidate?: (data: T) => void;
  onValidChange?: (valid: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

const messageColor = (m: FormMessage) => {
  switch (m.severity) {
    case 'error':
      return 'text-error';
    case 'warning':
      return 'text-warning';
    case 'info':
      return '';
  }
};

/**
 * Form provider. Mirrors the Svelte `Form.svelte`:
 *   - exposes a context via `useFormContext()`
 *   - holds a messages store synchronised through `useSyncExternalStore`
 *   - validates whenever `data` changes
 *
 * Note: data is treated as a mutable reference (parents pass an object/state
 * they mutate via `deepSet` from inputs). Call `validate()` from anywhere in
 * the tree to refresh messages.
 */
export function Form<T>({
  data,
  schema,
  validator,
  onSubmit,
  onChange,
  onPreValidate,
  onValidChange,
  className,
  children,
}: FormProps<T>) {
  const messagesStoreRef = React.useRef(createMessagesStore());
  const [valid, setValid] = React.useState(false);

  const validate = React.useCallback(() => {
    onPreValidate?.(data);
    const messages =
      validator?.(data) ??
      (schema
        ? (() => {
            const result = schema.safeParse(data);
            return result.success ? {} : zodErrorToFormMessages(result.error);
          })()
        : {});
    messagesStoreRef.current.set(messages);
    const isValid = Object.keys(messages).length === 0;
    setValid(isValid);
    onValidChange?.(isValid);
    onChange?.(data);
  }, [data, schema, validator, onPreValidate, onValidChange, onChange]);

  React.useEffect(() => {
    validate();
  }, [validate]);

  const ctx: FormContextValue<T> = React.useMemo(
    () => ({
      schema,
      messagesStore: messagesStoreRef.current,
      data,
      validate,
      valid,
    }),
    [schema, data, validate, valid],
  );

  const [messages, setMessages] = React.useState<FormMessages>({});
  React.useEffect(() => {
    return messagesStoreRef.current.subscribe(() => {
      setMessages(messagesStoreRef.current.get());
    });
  }, []);

  return (
    <FormCtx.Provider value={ctx as FormContextValue<unknown>}>
      <form
        className={cn('flex flex-col gap-4', className)}
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit?.(data);
        }}
      >
        {(messages['__form__'] || []).map((m, idx) => (
          <span key={idx} className={cn('flex items-center gap-2', messageColor(m))}>
            <Info className="size-4" />
            {m.text}
          </span>
        ))}
        {children}
      </form>
    </FormCtx.Provider>
  );
}
