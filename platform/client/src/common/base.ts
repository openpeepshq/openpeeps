import {
  type ClientConfig,
  fetchClient,
  type FetchClient,
} from '@openpeepshq/fetch-client';

export const apiClientConfig: ClientConfig = {
  baseUrl: '/api/openpeeps/core/v1',
};

export const coreApiClient = (): FetchClient => fetchClient(apiClientConfig);
