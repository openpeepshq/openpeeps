import { useEffect, useMemo, useState } from 'react';
import { ZodObject, type ZodRawShape, ZodArray, type ZodType } from 'zod';
import type { ConfigTree } from '@openpeepshq/common/types';
import { capitalizeFirstLetter } from '@openpeepshq/common';
import { ExpandableBox } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import {
  diffConfigTrees,
  equal,
  isFieldHidden,
  unwrap,
} from '../../lib/configuration/helpers';
import { ConfigurationList } from './ConfigurationList';
import { ConfigurationValueEditor } from './ConfigurationValueEditor';

export interface ConfigurationCategoryProps {
  schema: ZodObject<ZodRawShape>;
  config: Record<string, unknown>;
  defaults: Record<string, unknown>;
  path?: (string | number)[];
  value?: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
  collapsible?: boolean;
}

export function ConfigurationCategory({
  schema,
  config,
  defaults,
  path = [],
  value: valueProp,
  onChange,
  disabled: disabledProp,
  collapsible = true,
}: ConfigurationCategoryProps) {
  const t = useT();
  const disabled = disabledProp ?? schema.description === 'fixed';
  const [value, setValue] = useState<Record<string, unknown>>(
    () => structuredClone(valueProp ?? config),
  );

  useEffect(() => {
    setValue(structuredClone(valueProp ?? config));
  }, [valueProp, config]);

  const setAndNotify = (next: Record<string, unknown>) => {
    setValue(next);
    onChange(next);
  };

  const dirty = !equal(config as ConfigTree, value as ConfigTree);
  const dirtyPaths = useMemo(() => {
    const diff = diffConfigTrees(config as ConfigTree, value as ConfigTree) as Record<
      string,
      unknown
    >;
    return Object.keys(diff).flatMap((key) => [...path.map(String), key]);
  }, [config, value, path]);

  const pathName = path.at(-1);
  const fields = Object.entries(schema.shape).map(([key, def]) => ({
    key,
    def: def as ZodType,
    path: [...path, key],
  }));

  const updateField = (key: string, fieldValue: unknown) => {
    setAndNotify({ ...value, [key]: fieldValue });
  };

  const hasKey = (key: string) => dirtyPaths.includes(key);

  if (fields.length === 0) return null;

  const body = (
    <>
      {fields.map((field) => {
        if (isFieldHidden(field.def)) return null;
        const fieldSchema = unwrap(field.def);
        if (isFieldHidden(fieldSchema)) return null;

        const title = (
          <p
            className={
              !collapsible
                ? dirty && hasKey(String(field.key))
                  ? 'font-bold'
                  : ''
                : dirty && hasKey(String(field.key))
                  ? 'font-bold'
                  : ''
            }
          >
            {capitalizeFirstLetter(String(field.key))}
          </p>
        );

        if (fieldSchema instanceof ZodObject) {
          const nested = (
            <ConfigurationCategory
              schema={fieldSchema}
              path={field.path}
              config={(config[field.key] ?? {}) as Record<string, unknown>}
              defaults={(defaults[field.key] ?? {}) as Record<string, unknown>}
              value={(value[field.key] ?? {}) as Record<string, unknown>}
              onChange={(v) => updateField(String(field.key), v)}
              collapsible={false}
              disabled={disabled}
            />
          );
          return collapsible ? (
            <ExpandableBox key={String(field.key)} title={title} initialOpen={false}>
              {nested}
            </ExpandableBox>
          ) : (
            <div key={String(field.key)}>{title}{nested}</div>
          );
        }

        if (fieldSchema instanceof ZodArray) {
          return (
            <ConfigurationList
              key={String(field.key)}
              schema={fieldSchema as ZodArray<ZodType>}
              path={field.path}
              config={(config[field.key] ?? []) as unknown[]}
              value={(value[field.key] ?? []) as unknown[]}
              onChange={(v) => updateField(String(field.key), v)}
              disabled={disabled}
            />
          );
        }

        return (
          <ConfigurationValueEditor
            key={String(field.key)}
            schema={field.def}
            path={field.path.map(String)}
            config={config[field.key]}
            defaults={defaults[field.key]}
            value={value[field.key]}
            onChange={(v) => updateField(String(field.key), v)}
            disabled={disabled}
          />
        );
      })}
    </>
  );

  return (
    <div className={collapsible ? 'mt-4 pl-4' : ''}>
      {collapsible && (
        <p className={dirty ? 'font-bold' : ''}>
          {pathName || t('configuration.title', { defaultValue: 'Configuration' })}
        </p>
      )}
      {body}
    </div>
  );
}
