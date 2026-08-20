import { z } from 'zod';
import { PackageJson } from 'type-fest';

export interface Plugin {
  key: string;
  namespace: string;
  name: string;
  info: PackageJson;
  path: string;
  status?: 'loaded' | 'failed' | 'disabled';
  error?: string;
}

export const pluginInfoSchema = z.object({
  key: z.string(),
  namespace: z.string(),
  name: z.string(),
  version: z.string().optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['loaded', 'failed', 'disabled']).optional(),
});

export type PluginInfo = z.infer<typeof pluginInfoSchema>;

export const adminPluginInfoSchema = pluginInfoSchema.extend({
  error: z.string().optional(),
  /** Persisted desired state (DB override, falling back to the static gate). */
  enabled: z.boolean(),
  repositoryUrl: z.string().optional(),
  /** True when installed via the admin UI (can be uninstalled). */
  installed: z.boolean().optional(),
});

export type AdminPluginInfo = z.infer<typeof adminPluginInfoSchema>;

export const pluginManifestSchema = z.object({
  components: z
    .array(
      z.object({
        slot: z.string(),
        asset: z.string(),
        componentKey: z.string(),
      }),
    )
    .default([]),
});

export type PluginManifest = z.infer<typeof pluginManifestSchema>;

export const pluginEntrySchema = pluginInfoSchema.extend({
  manifest: pluginManifestSchema.optional(),
});

export type PluginEntry = z.infer<typeof pluginEntrySchema>;

export const pluginConfigItemSchema = z.object({
  namespace: z.string(),
  name: z.string(),
  config: z.record(z.string(), z.unknown()),
  defaults: z.record(z.string(), z.unknown()),
});

export type PluginConfigItem = z.infer<typeof pluginConfigItemSchema>;

export const pluginConfigResponseSchema = z.record(
  z.string(),
  z.record(z.string(), pluginConfigItemSchema),
);

export type PluginConfigResponse = z.infer<typeof pluginConfigResponseSchema>;
