import * as React from 'react';
import { cn, deepGet, deepSet } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from './Label';
import { useFormContext, useFormMessages } from './context';
import {
  datetimeLocalToIsoDate,
  getSchemaForPath,
  isoDateToDatetimeLocal,
  pathToString,
} from './helpers';
import type { OptionData } from './types';

type Element = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export interface FormInputProps {
  type?: string;
  title?: string;
  description?: string;
  path: (number | string)[];
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  options?: OptionData[];
  lead?: React.ReactNode;
  tail?: React.ReactNode;
  children?: React.ReactNode;
  timeZone?: string;
  elementToValue?: (e: Element) => string | boolean;
  transformValue?: (value: unknown) => string;
  step?: number;
  onInput?: (e: React.ChangeEvent<Element>) => void;
  testId?: string;
}

const defaultElementToValue = (timeZone: string) => (e: Element) => {
  if (e instanceof HTMLInputElement && e.type === 'checkbox') return e.checked;
  if (e instanceof HTMLInputElement && e.type === 'datetime-local') {
    return e.value ? datetimeLocalToIsoDate(e.value, timeZone) : '';
  }
  return (e as HTMLInputElement).value;
};

/**
 * React port of `FormInput.svelte`. Reads/writes the form data via deepGet/Set
 * on the path, then triggers `validate()` from the form context.
 */
export function FormInput({
  type = 'text',
  title = '',
  description = '',
  path,
  placeholder,
  disabled = false,
  readOnly = false,
  options = [],
  lead,
  tail,
  children,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  elementToValue,
  transformValue,
  step = 1,
  onInput,
  testId,
}: FormInputProps) {
  const { schema, data, validate } = useFormContext();
  const messages = useFormMessages();
  const [dirty, setDirty] = React.useState(false);

  const elemToVal = elementToValue ?? defaultElementToValue(timeZone);
  const xform =
    transformValue ??
    (type === 'datetime-local'
      ? (value: unknown) =>
          value ? isoDateToDatetimeLocal(String(value), timeZone) : ''
      : (value: unknown) => String(value ?? ''));

  const update = (e: React.ChangeEvent<Element>) => {
    const newValue = elemToVal(e.currentTarget);
    deepSet(data as object, path, newValue);
    onInput?.(e);
    setDirty(true);
    void validate();
  };

  const schemaForPath = getSchemaForPath(schema, path);
  const value = xform(deepGet(data, path));
  const checked = Boolean(deepGet(data, path));
  const cols = lead ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-[1fr_auto]';

  return (
    <Label
      title={title}
      description={description}
      messages={messages[pathToString(path)]}
      dirty={dirty}
      required={schemaForPath ? !schemaForPath.isOptional() : false}
      forCheckbox={type === 'checkbox'}
    >
      {type === 'textarea' ? (
        <Textarea
          disabled={disabled}
          value={value}
          onChange={update}
          placeholder={placeholder ?? title}
          readOnly={readOnly}
          data-testid={testId}
        />
      ) : type === 'checkbox' ? (
        <Input
          disabled={disabled}
          type="checkbox"
          checked={checked}
          onChange={update}
          data-testid={testId}
        />
      ) : type === 'select' ? (
        <select
          disabled={disabled}
          value={value}
          onChange={update}
          className="op-input"
        >
          {options.map((option, idx) => (
            <option key={idx} {...option}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'handle' ? (
        <div className={cn('op-input-group grid grid-cols-[auto_1fr_auto]')}>
          <div className="op-input-group-shim">@</div>
          <Input
            disabled={disabled}
            value={value}
            type="text"
            onChange={update}
            placeholder={placeholder ?? title}
            readOnly={readOnly}
            data-testid={testId}
          />
        </div>
      ) : type === 'mock' ? (
        <div className={cn('op-input-group grid', cols)}>
          {lead && <div className="op-input-group-shim">{lead}</div>}
          {children}
          {tail && <div className="op-input-group-shim">{tail}</div>}
        </div>
      ) : (
        <div className={cn('op-input-group grid', cols)}>
          {lead && <div className="op-input-group-shim">{lead}</div>}
          <Input
            disabled={disabled}
            value={value}
            type={type}
            onChange={update}
            placeholder={placeholder ?? title}
            readOnly={readOnly}
            step={step}
            data-testid={testId}
          />
          {tail && <div className="op-input-group-shim">{tail}</div>}
        </div>
      )}
    </Label>
  );
}
