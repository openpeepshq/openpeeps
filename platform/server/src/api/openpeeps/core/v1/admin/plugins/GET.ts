import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { adminPluginInfoSchema } from '@openpeepshq/common/types';
import {
  getPlugins,
  getPluginStateOverrides,
  getInstalledPluginKeys,
} from '@openpeepshq/core/plugins';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';

export const Output = z.array(adminPluginInfoSchema);

export const Error = {
  403: forbidden(),
};

const toOptionalString = (value: unknown) =>
  value != null ? String(value) : undefined;

/** Normalizes package.json's `repository` (string or `{ url }`) to a plain URL. */
const repositoryUrl = (
  repository: string | { url: string } | undefined,
): string | undefined => {
  const raw = typeof repository === 'string' ? repository : repository?.url;
  if (!raw) {
    return undefined;
  }
  return raw.replace(/^git\+/, '').replace(/\.git$/, '');
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-plugins-manage']);
    const [plugins, overrides, installedKeys] = await Promise.all([
      getPlugins(),
      getPluginStateOverrides(),
      getInstalledPluginKeys(),
    ]);
    const installedSet = new Set(installedKeys);
    return plugins.map((plugin) =>
      adminPluginInfoSchema.parse({
        key: plugin.key,
        namespace: plugin.namespace,
        name: plugin.name,
        version: plugin.info.version,
        displayName: toOptionalString(plugin.info.config?.displayName),
        description: plugin.info.description,
        status: plugin.status,
        error: plugin.error,
        // Desired state: DB override if set, else derived from the plugin's
        // current (boot-time) status. May differ from `status` right after a
        // toggle — the loader only re-reads overrides on the next restart.
        enabled: overrides[plugin.key] ?? plugin.status !== 'disabled',
        repositoryUrl: repositoryUrl(plugin.info.repository),
        installed: installedSet.has(plugin.key),
      }),
    );
  },
);
