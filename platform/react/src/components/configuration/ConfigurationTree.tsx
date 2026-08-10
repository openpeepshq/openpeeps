import { useEffect, useMemo, useState } from 'react';
import { ZodObject, type ZodRawShape } from 'zod';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import type { ConfigTree } from '@openpeepshq/common/types';
import { diffConfigTrees, equal } from '../../lib/configuration/helpers';
import { ConfigurationCategory } from './ConfigurationCategory';

export interface ConfigurationTreeProps {
  schema: ZodObject<ZodRawShape>;
  config: Record<string, unknown>;
  defaults: Record<string, unknown>;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}

export function ConfigurationTree({
  schema,
  config,
  defaults,
  onSave,
}: ConfigurationTreeProps) {
  const t = useT();
  const [value, setValue] = useState<Record<string, unknown>>(() =>
    structuredClone(config),
  );

  useEffect(() => {
    setValue(structuredClone(config));
  }, [config]);

  const unchanged = useMemo(
    () => equal(config as ConfigTree, value as ConfigTree),
    [config, value],
  );

  const handleSubmit = async () => {
    const data = diffConfigTrees(config as ConfigTree, value as ConfigTree);
    await onSave(data);
  };

  return (
    <div className="mb-20 h-full">
      <ConfigurationCategory
        schema={schema}
        config={config}
        defaults={defaults}
        value={value}
        onChange={setValue}
        collapsible={false}
      />
      <div className="mt-4 flex justify-end">
        <Button
          title={t('common.submit', { defaultValue: 'Submit' })}
          variant="variant-filled-primary"
          disabled={unchanged}
          action={handleSubmit}
        >
          {t('common.submit', { defaultValue: 'Submit' })}
        </Button>
      </div>
    </div>
  );
}
