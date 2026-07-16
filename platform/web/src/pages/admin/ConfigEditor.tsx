import { useEffect, useMemo, useState } from 'react';
import {
  useT,
  useOpenpeeps,
  useSetPageHeader,
  ConfigurationTree,
  resolveAdminConfigSchema,
} from '@openpeeps/react';
import { Button, LoadingSpinner, Toast } from '@openpeeps/react-ui';

export interface ConfigEditorProps {
  /** Page title. */
  title: string;
  /** Admin config namespace (e.g. 'openpeeps'). */
  namespace: string;
  /** Admin config item (e.g. 'core'). */
  name: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Generic admin editor for `admin.config.*` slots. Uses the registered Zod
 * schema (same as the Svelte ConfigurationTree) when available; otherwise
 * falls back to a JSON editor.
 */
export function AdminConfigEditor({
  title,
  namespace,
  name,
}: ConfigEditorProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const configQuery = openpeepsApi.admin.useConfigRead(namespace, name);
  const updateConfig = openpeepsApi.admin.updateConfigAction({
    namespace,
    name,
  });

  useSetPageHeader(title);

  const schema = useMemo(
    () => resolveAdminConfigSchema(namespace, name),
    [namespace, name],
  );

  const config = configQuery.data?.config;
  const defaults = configQuery.data?.defaults;

  const [draft, setDraft] = useState<string>('');
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const useSchemaForm =
    !!schema && (isPlainObject(config) || isPlainObject(defaults));

  useEffect(() => {
    if (configQuery.data && !useSchemaForm) {
      setDraft(JSON.stringify(configQuery.data.config ?? {}, null, 2));
    }
  }, [configQuery.data, useSchemaForm]);

  if (configQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  const saveJson = async () => {
    setStatus(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch (err) {
      setStatus({
        type: 'error',
        message: `Invalid JSON: ${(err as Error).message}`,
      });
      return;
    }
    setSaving(true);
    try {
      await updateConfig({ config: parsed });
      setStatus({
        type: 'success',
        message: t('admin.config.saved', { defaultValue: 'Saved.' }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const saveSchemaPatch = async (patch: Record<string, unknown>) => {
    setStatus(null);
    setSaving(true);
    try {
      await updateConfig({ config: patch });
      setStatus({
        type: 'success',
        message: t('admin.config.saved', { defaultValue: 'Saved.' }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (useSchemaForm && schema) {
    const cfg = isPlainObject(config) ? config : {};
    const def = isPlainObject(defaults) ? defaults : {};
    return (
      <div className="space-y-4 p-4">
        <p className="text-muted-foreground text-xs">
          {namespace}.{name}
        </p>
        <ConfigurationTree
          schema={schema}
          config={cfg}
          defaults={def}
          onSave={saveSchemaPatch}
        />
        {status && (
          <Toast variant={status.type} onDismiss={() => setStatus(null)}>
            {status.message}
          </Toast>
        )}
      </div>
    );
  }

  const defaultsForView =
    defaults !== undefined ? JSON.stringify(defaults, null, 2) : null;

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground text-xs">
        {namespace}.{name}
      </p>
      {!schema && (
        <p className="text-muted-foreground text-xs">
          {t('admin.config.noSchema', {
            defaultValue:
              'No Zod schema is registered for this slot — editing as JSON.',
          })}
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Current value (JSON)</h2>
        <textarea
          rows={20}
          value={draft}
          spellCheck={false}
          className="bg-surface-100 w-full rounded-md border p-2 font-mono text-xs"
          onChange={(e) => setDraft(e.target.value)}
        />
      </section>

      {defaultsForView !== null && (
        <details className="space-y-2 rounded-md border p-2 text-xs">
          <summary className="cursor-pointer font-medium">
            View server defaults
          </summary>
          <pre className="bg-surface-100 overflow-x-auto whitespace-pre-wrap p-2 text-xs">
            {defaultsForView}
          </pre>
        </details>
      )}

      {status && (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      )}

      <Button
        title="Save"
        variant="variant-filled-primary"
        action={saveJson}
        disabled={saving}
        loadingContent={t('common.saving', { defaultValue: 'Saving…' })}
      >
        {t('common.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
