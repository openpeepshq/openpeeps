import { useEffect, useState } from 'react';

import { useOpenpeeps, useT } from '@openpeeps/react';
import { PluginSlot } from '@openpeeps/react/components';
import type { PluginConfigResponse, PluginEntry } from '@openpeeps/common';
import { LoadingSpinner } from '@openpeeps/react-ui';

const SENSITIVE_KEY_PATTERNS = [
  'password',
  'secret',
  'token',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'credential',
];

const isSensitiveKey = (key: string) =>
  SENSITIVE_KEY_PATTERNS.some((pattern) => key.toLowerCase().includes(pattern));

const maskSensitive = (value: unknown, key = ''): unknown => {
  if (
    (typeof value === 'string' || typeof value === 'number') &&
    isSensitiveKey(key)
  ) {
    return '***';
  }
  if (Array.isArray(value)) {
    return value.map((item) => maskSensitive(item, key));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        maskSensitive(v, k),
      ]),
    );
  }
  return value;
};

const safeJsonStringify = (obj: unknown): string =>
  JSON.stringify(maskSensitive(obj), null, 2);

export const PluginsIndex = () => {
  const { client } = useOpenpeeps();
  const t = useT();
  const [plugins, setPlugins] = useState<PluginEntry[] | null>(null);
  const [config, setConfig] = useState<PluginConfigResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([client.plugins.list(), client.plugins.config()]).then(
      ([listResult, configResult]) => {
        if (cancelled) {
          return;
        }
        if ('error' in listResult || 'error' in configResult) {
          setError(t('plugins.error'));
          return;
        }
        setPlugins(listResult.data);
        setConfig(configResult.data);
      },
      (err) => {
        if (cancelled) {
          return;
        }
        setError(String(err));
      },
    );

    return () => {
      cancelled = true;
    };
  }, [client, t]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-bold">{t('plugins.pageTitle')}</h1>
        <p className="text-error">{t('plugins.error')}</p>
      </div>
    );
  }

  if (!plugins || !config) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t('plugins.pageTitle')}</h1>

      <PluginSlot name="plugins.header" className="mb-6" />

      {plugins.length === 0 ? (
        <p className="text-muted-foreground">{t('plugins.noPlugins')}</p>
      ) : (
        <ul className="space-y-4">
          {plugins.map((plugin) => (
            <li key={plugin.key} className="rounded-lg border p-4">
              <h2 className="text-lg font-semibold">
                {plugin.displayName ?? plugin.name}
                <span className="text-muted-foreground ml-2 text-sm">
                  {plugin.version}
                </span>
              </h2>
              {plugin.description ? (
                <p className="text-muted-foreground text-sm">
                  {plugin.description}
                </p>
              ) : null}
              <div
                className="text-muted-foreground mt-2 text-xs"
                title={t('plugins.configTitle')}
              >
                <pre className="bg-muted overflow-auto rounded p-2 text-xs">
                  {safeJsonStringify(
                    config[plugin.namespace]?.[plugin.name] ?? {},
                  )}
                </pre>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PluginSlot name="plugins.footer" className="mt-6" />
    </div>
  );
};
