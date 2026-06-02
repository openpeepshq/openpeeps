import { client } from './helpers';
import type { TokenResponse } from '@openpeeps/common';
import { setCredentials } from '$lib/auth';

export const authenticateGeneric = (params: { data: Record<string, string> }) =>
	client.sso.generic.authenticate(params).then(r => {
		if ('data' in r) {
			setCredentials({ token: r.data.token });
		}
		return r;
	});

export const authenticateOidc = (params: Record<string, string>) =>
	client.sso.oidc.callback({
		// @ts-expect-error - pathParameters handled by fetch-client
		pathParameters: {},
		queryParameters: params,
	}).then(r => {
		if ('data' in r) {
			setCredentials({ token: r.data.token });
		}
		return { success: r.data?.success ?? false, token: r.data?.token ?? '', error: '' };
	}) as Promise<{ success: boolean; token: string; error?: string }>;

export const getOidcAuthorizeUrl = async (providerId: string): Promise<string> => {
	const result = await client.sso.oidc.authorize({
		// @ts-expect-error - pathParameters handled by fetch-client
		pathParameters: { id: providerId },
	});
	if ('data' in result) {
		return result.data.redirectUrl;
	}
	throw new Error(result.error?.message || 'Failed to get OIDC authorize URL');
};
