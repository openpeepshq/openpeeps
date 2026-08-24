import { useState } from 'react';
import { ExternalLink, RefreshCw, Upload, X } from 'lucide-react';
import type { AdminPluginInfo } from '@openpeepshq/common';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { LoadingSpinner, Switch, Button, Input } from '@openpeepshq/react-ui';

type PluginStatus = NonNullable<AdminPluginInfo['status']>;

const PluginCard = ({
  plugin,
  statusLabels,
  reloadHint,
  repositoryLabel,
  showReloadHint,
  pending,
  onToggle,
  onUninstall,
}: {
  plugin: AdminPluginInfo;
  statusLabels: Record<PluginStatus, string>;
  reloadHint: string;
  repositoryLabel: string;
  showReloadHint: boolean;
  pending: boolean;
  onToggle: (enabled: boolean) => void;
  onUninstall?: () => void;
}) => {
  const t = useT();
  const status: PluginStatus = plugin.status ?? 'loaded';
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {plugin.displayName ?? plugin.name}
            {plugin.version ? (
              <span className="text-muted-foreground ml-2 text-sm">
                {plugin.version}
              </span>
            ) : null}
          </p>
          <p className="text-muted-foreground text-xs">{plugin.key}</p>
          {plugin.description ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {plugin.description}
            </p>
          ) : null}
          {plugin.repositoryUrl ? (
            <a
              href={plugin.repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary mt-1 inline-flex items-center gap-1 text-xs underline"
            >
              <ExternalLink className="size-3" />
              {repositoryLabel}
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={
              status === 'failed'
                ? 'text-error text-xs font-semibold'
                : 'text-muted-foreground text-xs font-semibold'
            }
          >
            {statusLabels[status]}
          </span>
          <div className="flex items-center gap-2">
            {onUninstall ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={onUninstall}
                className="text-error hover:text-error h-8 px-2"
              >
                {t('admin.plugins.uninstall', { defaultValue: 'Uninstall' })}
              </Button>
            ) : null}
            <Switch
              checked={plugin.enabled}
              disabled={pending}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
      </div>
      {status === 'failed' && plugin.error ? (
        <p className="text-error mt-2 break-all text-xs">{plugin.error}</p>
      ) : null}
      {showReloadHint ? (
        <p className="text-muted-foreground mt-2 text-xs">{reloadHint}</p>
      ) : null}
    </div>
  );
};

export const AdminPlugins = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const pluginsQuery = openpeepsApi.admin.usePluginsList();
  const updatePluginState = openpeepsApi.admin.updatePluginStateAction();
  const reloadPluginsAction = openpeepsApi.admin.reloadPluginsAction();
  const installPlugin = openpeepsApi.admin.installPluginAction();
  const uninstallPlugin = openpeepsApi.admin.uninstallPluginAction();

  useSetPageHeader(t('admin.plugins.title', { defaultValue: 'Plugins' }));

  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const [reloading, setReloading] = useState(false);
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [installType, setInstallType] = useState<'npm' | 'git'>('npm');
  const [installSource, setInstallSource] = useState('');
  const [installVersion, setInstallVersion] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const plugins = (pluginsQuery.data ?? []) as AdminPluginInfo[];

  const statusLabels: Record<PluginStatus, string> = {
    loaded: t('admin.plugins.status.loaded', { defaultValue: 'Loaded' }),
    disabled: t('admin.plugins.status.disabled', { defaultValue: 'Disabled' }),
    failed: t('admin.plugins.status.failed', { defaultValue: 'Failed' }),
  };

  const toggle = async (plugin: AdminPluginInfo, enabled: boolean) => {
    setPendingKeys((prev) => new Set(prev).add(plugin.key));
    try {
      await updatePluginState(
        { enabled },
        { namespace: plugin.namespace, name: plugin.name },
      );
      setChangedKeys((prev) => new Set(prev).add(plugin.key));
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(plugin.key);
        return next;
      });
    }
  };

  const [uninstallError, setUninstallError] = useState<string | null>(null);

  const uninstall = async (plugin: AdminPluginInfo) => {
    setPendingKeys((prev) => new Set(prev).add(plugin.key));
    setUninstallError(null);
    try {
      await uninstallPlugin({
        namespace: plugin.namespace,
        name: plugin.name,
      });
      setChangedKeys((prev) => new Set(prev).add(plugin.key));
      void pluginsQuery.refetch();
    } catch (e) {
      setUninstallError(e instanceof Error ? e.message : String(e));
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(plugin.key);
        return next;
      });
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    setInstallError(null);
    try {
      const source =
        installType === 'npm'
          ? {
              type: 'npm' as const,
              package: installSource,
              version: installVersion || undefined,
            }
          : {
              type: 'git' as const,
              url: installSource,
              ref: installVersion || undefined,
            };
      await installPlugin(source);
      setInstallSource('');
      setInstallVersion('');
      setShowInstallForm(false);
      setChangedKeys(new Set());
      void pluginsQuery.refetch();
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : String(e);
      setInstallError(msg);
    } finally {
      setInstalling(false);
    }
  };

  const reload = async () => {
    setReloading(true);
    try {
      await reloadPluginsAction();
      // The client-side plugin registry loaded its manifest and script tags
      // at mount time; only a full page reload picks up the new state.
      window.location.reload();
    } finally {
      setReloading(false);
    }
  };

  if (pluginsQuery.isError) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-error text-sm">
          {t('admin.plugins.error', { defaultValue: 'Failed to load plugins' })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {t('admin.plugins.description', {
            defaultValue:
              'Enable or disable plugins. Changes take effect after reload.',
          })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInstallForm(!showInstallForm)}
          >
            <Upload className="mr-2 size-4" />
            {t('admin.plugins.install', { defaultValue: 'Install' })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={reloading}
            onClick={reload}
          >
            <RefreshCw
              className={`mr-2 size-4 ${reloading ? 'animate-spin' : ''}`}
            />
            {t('admin.plugins.reload', { defaultValue: 'Reload' })}
          </Button>
        </div>
      </div>

      {showInstallForm && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {t('admin.plugins.installTitle', {
                defaultValue: 'Install Plugin',
              })}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInstallForm(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={installType === 'npm' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInstallType('npm')}
            >
              npm
            </Button>
            <Button
              variant={installType === 'git' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInstallType('git')}
            >
              Git
            </Button>
          </div>
          <Input
            placeholder={
              installType === 'npm'
                ? t('admin.plugins.npmPlaceholder', {
                    defaultValue: 'Package name (e.g. @namespace/plugin-name)',
                  })
                : t('admin.plugins.gitPlaceholder', {
                    defaultValue: 'Repository URL',
                  })
            }
            value={installSource}
            onChange={(e) => setInstallSource(e.target.value)}
          />
          <Input
            placeholder={
              installType === 'npm'
                ? t('admin.plugins.versionPlaceholder', {
                    defaultValue: 'Version (optional, defaults to latest)',
                  })
                : t('admin.plugins.refPlaceholder', {
                    defaultValue: 'Branch or tag (optional, defaults to main)',
                  })
            }
            value={installVersion}
            onChange={(e) => setInstallVersion(e.target.value)}
          />
          {installError ? (
            <p className="text-error text-xs">{installError}</p>
          ) : null}
          <Button
            size="sm"
            disabled={!installSource || installing}
            onClick={() => void handleInstall()}
          >
            {installing
              ? t('admin.plugins.installing', { defaultValue: 'Installing...' })
              : t('admin.plugins.installConfirm', { defaultValue: 'Install' })}
          </Button>
        </div>
      )}

      {pluginsQuery.isLoading ? (
        <LoadingSpinner />
      ) : plugins.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t('admin.plugins.empty', { defaultValue: 'No plugins loaded.' })}
        </p>
      ) : (
        <>
          {uninstallError ? (
            <p className="text-error text-sm">{uninstallError}</p>
          ) : null}
          {plugins.map((plugin) => (
            <PluginCard
              key={plugin.key}
              plugin={plugin}
              statusLabels={statusLabels}
              reloadHint={t('admin.plugins.reloadRequired', {
                defaultValue: 'Toggle saved. Press "Reload" to apply changes.',
              })}
              repositoryLabel={t('admin.plugins.repository', {
                defaultValue: 'Repository',
              })}
              showReloadHint={changedKeys.has(plugin.key)}
              pending={pendingKeys.has(plugin.key)}
              onToggle={(enabled) => void toggle(plugin, enabled)}
              onUninstall={
                plugin.installed ? () => void uninstall(plugin) : undefined
              }
            />
          ))}
        </>
      )}
    </div>
  );
};
