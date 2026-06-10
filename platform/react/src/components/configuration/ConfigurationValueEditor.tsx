import { useEffect, useMemo, useState } from 'react';
import { z, type ZodType } from 'zod';
import { Input, Textarea } from '@openpeeps/react-ui';
import { useT } from '../../i18n';
import { unwrap } from '../../lib/configuration/helpers';

export interface ConfigurationValueEditorProps {
  schema: ZodType;
  config: unknown;
  defaults: unknown;
  path: (string | number)[];
  value?: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function ConfigurationValueEditor({
  schema,
  config,
  defaults,
  path,
  value: valueProp,
  onChange,
  disabled: disabledProp,
}: ConfigurationValueEditorProps) {
  const t = useT();
  const unwrappedSchema = useMemo(() => unwrap(schema), [schema]);
  const disabled = disabledProp ?? schema.description === 'fixed';
  const [value, setValue] = useState(valueProp ?? config);

  useEffect(() => {
    setValue(valueProp ?? config);
  }, [valueProp, config]);

  const setAndNotify = (next: unknown) => {
    setValue(next);
    onChange(next);
  };

  const dirty = value !== config;
  const label = t(String(path.at(-1)), {
    defaultValue: String(path.at(-1)),
  });
  const password = schema.description === 'password';
  const longText = schema.description === 'longText';

  if (unwrappedSchema instanceof z.ZodString) {
    if (longText) {
      return (
        <div className="my-2 pl-4">
          <label className="label flex flex-col gap-1">
            <span className={dirty ? 'font-bold' : ''}>{label}</span>
            <Textarea
              value={String(value ?? '')}
              placeholder={String(defaults ?? '')}
              disabled={disabled}
              onChange={(e) => setAndNotify(e.target.value)}
            />
          </label>
        </div>
      );
    }
    return (
      <div className="my-2 pl-4">
        <label className="label flex flex-col gap-1">
          <span className={dirty ? 'font-bold' : ''}>{label}</span>
          <Input
            type={password ? 'password' : 'text'}
            value={String(value ?? '')}
            placeholder={String(defaults ?? '')}
            disabled={disabled}
            onChange={(e) => setAndNotify(e.target.value)}
          />
        </label>
      </div>
    );
  }

  if (unwrappedSchema instanceof z.ZodNumber) {
    return (
      <div className="my-2 pl-4">
        <label className="label flex flex-col gap-1">
          <span className={dirty ? 'font-bold' : ''}>{label}</span>
          <Input
            type="number"
            value={value === undefined || value === null ? '' : String(value)}
            placeholder={String(defaults ?? '')}
            disabled={disabled}
            onChange={(e) =>
              setAndNotify(e.target.value === '' ? undefined : Number(e.target.value))
            }
          />
        </label>
      </div>
    );
  }

  if (unwrappedSchema instanceof z.ZodBoolean) {
    return (
      <div className="my-2 pl-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(e) => setAndNotify(e.target.checked)}
          />
          <span className={dirty ? 'font-bold' : ''}>{label}</span>
        </label>
      </div>
    );
  }

  if (unwrappedSchema instanceof z.ZodEnum) {
    const options =
      unwrappedSchema.options ??
      (unwrappedSchema._def?.entries
        ? Object.keys(unwrappedSchema._def.entries)
        : []);
    return (
      <div className="my-2 pl-4">
        <p className={dirty ? 'font-bold' : ''}>{label}</p>
        {(options as string[]).map((option) => (
          <label key={option} className="flex items-center gap-2">
            <input
              type="radio"
              className="radio"
              name={path.join('-')}
              value={option}
              checked={value === option}
              disabled={disabled}
              onChange={() => setAndNotify(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  return null;
}
