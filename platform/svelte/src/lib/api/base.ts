import { type ClientConfig, fetchClient, type FetchClient } from '@openpeeps/fetch-client';
import { getCredentials } from '$lib/auth';

export const apiClientConfig: ClientConfig = {
	baseUrl: '/api/openpeeps/core/v1'
};

export const coreApiClient = (): FetchClient => fetchClient(apiClientConfig);

export const authHeaders = () => {
	const { token } = getCredentials();
	return token
		? {
				Authorization: `Bearer ${token}`
			}
		: undefined;
};

export const authenticatedCoreApiClient = (): FetchClient =>
	fetchClient({ ...apiClientConfig, headers: authHeaders() ?? {} });
