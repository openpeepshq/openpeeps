import { useEffect, useState } from 'react';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { Button } from '@openpeeps/react-ui';

export interface ConfigEditorProps {
  /** Page title. */
  title: string;
  /** Admin config namespace (e.g. 'community'). */
  namespace: string;
  /** Admin config item (e.g. 'info'). */
  name: string;
}

/**
 * Generic admin JSON editor for `admin.config.*` slots. Lets the operator view
 * server defaults next to the current override and save edits without leaving
 * the React shell. Specialized form UIs can replace this on a per-slot basis
 * later — until then this gives full coverage of the configuration namespace.
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

  const [draft, setDraft] = useState<string>('');
  const [status, setStatus] = useState<
    | { type: 'success' | 'error'; message: string }
    | null
  >(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (configQuery.data) {
      setDraft(JSON.stringify(configQuery.data.config ?? {}, null, 2));
    }
  }, [configQuery.data]);

  if (configQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const save = async () => {
    setStatus(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch (err) {
      setStatus({ type: 'error', message: `Invalid JSON: ${(err as Error).message}` });
      return;
    }
    setSaving(true);
    try {
      await updateConfig({ config: parsed });
      setStatus({
        type: 'success',
        message: t('admin.config.saved', {
          defaultValue: 'Saved.',
        }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const defaults = configQuery.data?.defaults;
  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">
          {namespace}.{name}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Current value (JSON)</h2>
        <textarea
          rows={20}
          value={draft}
          spellCheck={false}
          className="w-full rounded-md border bg-surface-100 p-2 font-mono text-xs"
          onChange={(e) => setDraft(e.target.value)}
        />
      </section>

      {defaults !== undefined && (
        <details className="space-y-2 rounded-md border p-2 text-xs">
          <summary className="cursor-pointer font-medium">
            View server defaults
          </summary>
          <pre className="overflow-x-auto whitespace-pre-wrap bg-surface-100 p-2 text-xs">
            {JSON.stringify(defaults, null, 2)}
          </pre>
        </details>
      )}

      {status && (
        <p
          className={`rounded-md border p-2 text-sm ${status.type === 'error' ? 'border-error/40 text-error' : 'border-success/40 text-success'}`}
        >
          {status.message}
        </p>
      )}

      <Button
        title="Save"
        variant="variant-filled-primary"
        action={save}
        disabled={saving}
      >
        {saving
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('common.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
