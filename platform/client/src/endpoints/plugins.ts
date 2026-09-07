import type {
  BodyType,
  FetchClient,
  TypedEndpointOptions,
} from '@openpeepshq/fetch-client';
import type {
  PluginConfigResponse,
  PluginEntry,
  PluginManifest,
} from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

type PluginManifestEntry = PluginManifest & {
  key: string;
  namespace: string;
  name: string;
};
type PluginRoutePath = readonly [string, ...string[]];
type PluginRouteRequestOptions = Pick<
  TypedEndpointOptions<undefined, Record<string, string>>,
  'onResponseStatus' | 'signal'
>;

const pluginRoutePath = (
  namespace: string,
  name: string,
  pathSegments: PluginRoutePath,
): string =>
  `/plugins/${[namespace, name, ...pathSegments]
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;

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
  readRoute: <Output>(
    namespace: string,
    name: string,
    pathSegments: PluginRoutePath,
    queryParameters: Record<string, string> = {},
    options: PluginRouteRequestOptions = {},
  ) =>
    allpeepNoPayloadEndpoint<Output, undefined, Record<string, string>>(
      rawClient,
      pluginRoutePath(namespace, name, pathSegments),
    )({ queryParameters, ...options }),
  writeRoute: <Output, Input extends BodyType>(
    namespace: string,
    name: string,
    pathSegments: PluginRoutePath,
    payload: Input,
    queryParameters: Record<string, string> = {},
    options: PluginRouteRequestOptions = {},
  ) =>
    allpeepPayloadEndpoint<Output, Input, undefined, Record<string, string>>(
      rawClient,
      pluginRoutePath(namespace, name, pathSegments),
    )(payload, { queryParameters, ...options }),
  updateRoute: <Output, Input extends BodyType>(
    namespace: string,
    name: string,
    pathSegments: PluginRoutePath,
    payload: Input,
    queryParameters: Record<string, string> = {},
    options: PluginRouteRequestOptions = {},
  ) =>
    allpeepPayloadEndpoint<Output, Input, undefined, Record<string, string>>(
      rawClient,
      pluginRoutePath(namespace, name, pathSegments),
      'put',
    )(payload, { queryParameters, ...options }),
  removeRoute: <Output, Input extends BodyType>(
    namespace: string,
    name: string,
    pathSegments: PluginRoutePath,
    payload: Input,
    queryParameters: Record<string, string> = {},
    options: PluginRouteRequestOptions = {},
  ) =>
    allpeepPayloadEndpoint<Output, Input, undefined, Record<string, string>>(
      rawClient,
      pluginRoutePath(namespace, name, pathSegments),
      'delete',
    )(payload, { queryParameters, ...options }),
});
