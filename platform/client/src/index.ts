import { noPayloadEventSource, fetchClient } from '@openpeepshq/fetch-client';
import type {
  ClientConfig,
  ClientConfigSource,
} from '@openpeepshq/fetch-client/types';
import { admin } from './endpoints/admin';
import { i18n } from './endpoints/i18n';
import { accounts } from './endpoints/accounts';
import { jams } from './endpoints/jams';
import { auth } from './endpoints/auth';
import { conversations } from './endpoints/conversations';
import { groups } from './endpoints/groups';
import { posts } from './endpoints/posts';
import { plugins } from './endpoints/plugins';
import { server } from './endpoints/server';
import { profiles } from './endpoints/profiles';
import { sso } from './endpoints/sso';
import { location } from './endpoints/location';
import { reports } from './endpoints/reports';
import { media } from './endpoints/media';
import { search } from './endpoints/search';
import { previewLink } from './endpoints/previewLink';
import { Endpoints } from './endpoints/types';
import { payments } from './endpoints/payments';
import { streaming } from './endpoints/streaming';
import { webhookHandler } from './webhooks';

export interface OpenpeepsClientOptions {
  baseUrl?: string;
  token?: string;
}

const allPeepClientOptionsToClientConfig = (
  options?: OpenpeepsClientOptions,
): ClientConfig => ({
  baseUrl: (options?.baseUrl ?? '') + '/api/openpeeps/core/v1',
  headers: options?.token
    ? {
        Authorization: `Bearer ${options.token}`,
      }
    : undefined,
});

export const openpeepsClient = (
  options?:
    | OpenpeepsClientOptions
    | (() => Promise<OpenpeepsClientOptions> | OpenpeepsClientOptions),
): Endpoints => {
  const config: ClientConfigSource =
    typeof options === 'function'
      ? async () => allPeepClientOptionsToClientConfig(await options())
      : allPeepClientOptionsToClientConfig(options);

  const rawClient = fetchClient(config);
  const allPeepNoPayloadEventSource = noPayloadEventSource(config);

  const serverEndpoints = server(rawClient);
  return {
    admin: admin(rawClient),
    accounts: accounts(rawClient),
    auth: auth(rawClient),
    conversations: conversations(rawClient),
    groups: groups(rawClient),
    i18n: i18n(rawClient),
    jams: jams(rawClient, allPeepNoPayloadEventSource),
    mediaAttachment: media(rawClient, allPeepNoPayloadEventSource),
    plugins: plugins(rawClient),
    posts: posts(rawClient),
    previewLink: previewLink(rawClient),
    profiles: profiles(rawClient),
    server: serverEndpoints,
    sso: sso(rawClient),
    location: location(rawClient),
    reports: reports(rawClient),
    search: search(rawClient),
    payments: payments(rawClient),
    streaming: streaming(rawClient),
    webhookHandler: webhookHandler(serverEndpoints.keys.webhooks.public),
  };
};

export type {
  OpenpeepsPayloadEndpoint,
  OpenpeepsNoPayloadEndpoint,
} from './types';
export type OpenpeepsClient = ReturnType<typeof openpeepsClient>;
