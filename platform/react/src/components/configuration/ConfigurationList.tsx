import { useMemo, useState } from 'react';
import { z, ZodArray, type ZodType, type ZodTypeAny } from 'zod';
import { Minus, Plus } from 'lucide-react';
import { useT } from '../../i18n';
import { equal, unwrap } from '../../lib/configuration/helpers';
import { ConfigurationCategory } from './ConfigurationCategory';
import { ConfigurationValueEditor } from './ConfigurationValueEditor';

export interface ConfigurationListProps {
  schema: ZodArray<ZodTypeAny>;
  config: unknown[];
  path?: (string | number)[];
  value?: unknown[];
  onChange: (value: unknown[]) => void;
  disabled?: boolean;
}

export function ConfigurationList({
  schema,
  config,
  path = [],
  value: valueProp,
  onChange,
  disabled: disabledProp,
}: ConfigurationListProps) {
  const t = useT();
  const disabled = disabledProp ?? schema.description === 'fixed';
  const elementSchema = (schema.element ?? schema._def.type) as ZodType;
  const unwrappedElementSchema = unwrap(elementSchema);
  const defaults = useMemo(() => elementSchema.parse(undefined), [elementSchema]);
  const [value, setValue] = useState<unknown[]>(valueProp ?? [...config]);

  const setAndNotify = (next: unknown[]) => {
    setValue(next);
    onChange(next);
  };

  const dirty = !equal(config as never, value as never); // list roots are arrays

  return (
    <div className="mt-4 pl-4">
      <p className={dirty ? 'font-bold' : ''}>
        {path.at(-1) || t('admin.configuration.unnamedSection', { defaultValue: 'Section' })}
      </p>
      {value.map((_, index) => (
        <div key={index}>
          {unwrappedElementSchema instanceof z.ZodObject ? (
            <ConfigurationCategory
              schema={unwrappedElementSchema}
              path={[...path, String(index)]}
              config={(config?.[index] ?? defaults) as Record<string, unknown>}
              defaults={defaults as Record<string, unknown>}
              value={(value[index] ?? defaults) as Record<string, unknown>}
              onChange={(entry) => {
                const next = [...value];
                next[index] = entry;
                setAndNotify(next);
              }}
              disabled={disabled}
              collapsible={false}
            />
          ) : (
            <ConfigurationValueEditor
              schema={elementSchema}
              path={[...path, index]}
              config={config?.[index] ?? defaults}
              defaults={defaults}
              value={value[index]}
              onChange={(entry) => {
                const next = [...value];
                next[index] = entry;
                setAndNotify(next);
              }}
              disabled={disabled}
            />
          )}
          <button
            type="button"
            title={t('common.listEditor.removeTitle', { defaultValue: 'Remove' })}
            onClick={() => setAndNotify(value.toSpliced(index, 1))}
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        title={t('common.listEditor.addTitle', { defaultValue: 'Add' })}
        onClick={() => setAndNotify([...value, structuredClone(defaults)])}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
