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

const npmPluginInstallAuthSchema = z.object({
  token: z.string().min(1),
  registry: z
    .string()
    .url()
    .refine(
      (value) => {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
      },
      {
        message: 'Registry URL must use HTTPS and must not contain credentials',
      },
    )
    .optional(),
});

const gitPluginInstallAuthSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('token'),
    username: z.string().min(1),
    token: z.string().min(1),
  }),
  z.object({
    type: z.literal('ssh'),
    privateKey: z.string().min(1),
  }),
]);

export const pluginInstallSourceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('npm'),
    package: z
      .string()
      .regex(
        /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i,
        'Enter an npm package name',
      ),
    version: z.string().optional(),
    auth: npmPluginInstallAuthSchema.optional(),
  }),
  z
    .object({
      type: z.literal('git'),
      url: z.string().url(),
      ref: z.string().optional(),
      auth: gitPluginInstallAuthSchema.optional(),
    })
    .superRefine(({ auth, url }, context) => {
      const parsedUrl = new URL(url);
      if (
        parsedUrl.password ||
        (parsedUrl.username && parsedUrl.protocol !== 'ssh:')
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Repository URLs must not contain credentials',
          path: ['url'],
        });
      }
      if (auth?.type === 'token' && parsedUrl.protocol !== 'https:') {
        context.addIssue({
          code: 'custom',
          message: 'Token authentication requires an HTTPS repository URL',
          path: ['url'],
        });
      }
      if (auth?.type === 'ssh' && parsedUrl.protocol !== 'ssh:') {
        context.addIssue({
          code: 'custom',
          message: 'SSH authentication requires an ssh:// repository URL',
          path: ['url'],
        });
      }
    }),
  z.object({
    type: z.literal('marketplace'),
    listing: z
      .string()
      .regex(/^[a-z0-9-]+\/[a-z0-9-]+$/, 'Listing id must be namespace/name'),
    version: z.string().optional(),
    /** Digest of the originally installed tarball; self-heal verifies against it. */
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/, 'sha256 must be 64 hex characters')
      .optional(),
  }),
]);

export type PluginInstallSource = z.infer<typeof pluginInstallSourceSchema>;

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

export const pluginStoreListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  priceCents: z.number(),
  currency: z.string(),
  latest: z
    .object({
      version: z.string(),
      hostRange: z.string(),
      sha256: z.string(),
    })
    .nullable(),
});

export type PluginStoreListing = z.infer<typeof pluginStoreListingSchema>;

export const pluginStoreCatalogSchema = z.object({
  storeUrl: z.string().optional(),
  listings: z.array(pluginStoreListingSchema),
});

export type PluginStoreCatalog = z.infer<typeof pluginStoreCatalogSchema>;

export const pluginStoreEntitlementSchema = z.object({
  token: z.string().min(1),
  version: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  signature: z.string().min(1),
});

export type PluginStoreEntitlement = z.infer<
  typeof pluginStoreEntitlementSchema
>;

export const pluginStoreErrorSchema = z.object({
  error: z.string().min(1),
});

export type PluginStoreError = z.infer<typeof pluginStoreErrorSchema>;
