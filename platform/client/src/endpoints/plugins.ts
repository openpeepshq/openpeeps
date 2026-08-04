import type { FetchClient } from '@openpeeps/fetch-client';
import type {
  PluginConfigResponse,
  PluginEntry,
  PluginManifest,
} from '@openpeeps/common';
import { allpeepNoPayloadEndpoint } from './helpers';

type PluginManifestEntry = PluginManifest & {
  key: string;
  namespace: string;
  name: string;
};

export const plugins = (rawClient: FetchClient) => ({
  list: allpeepNoPayloadEndpoint<PluginEntry[]>(rawClient, '/plugins'),
  config: allpeepNoPayloadEndpoint<PluginConfigResponse>(
    rawClient,
    '/plugins/config',
  ),
  manifest: allpeepNoPayloadEndpoint<PluginManifestEntry[]>(
    rawClient,
    '/plugins/manifest',
  ),
});
