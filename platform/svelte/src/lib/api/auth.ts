import type { ResetPasswordRequest, TokenResponse } from '@openpeeps/common/types';
import { setCredentials } from '$lib/auth';
import {
	authHeaders,
	authenticatedCoreApiClient,
} from './base';
import { client, throwError, throwErrorWrapperPayload, updateCredentialsWrapper } from './helpers';

export const login = updateCredentialsWrapper(client.auth.login);
export const register = updateCredentialsWrapper(client.auth.register);
export const requestResetPassword = throwErrorWrapperPayload(client.auth.requestResetPassword);

export const resetPassword = (data: ResetPasswordRequest, token: string) =>
	client.auth
		.resetPassword(data, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		})
		.then(throwError());

export const getGuestPass = updateCredentialsWrapper(client.auth.guestPass);

/** Refresh session JWT (same profile/scopes). Requires stored credentials; uses authenticated fetch. */
export const refresh = () => {
	const headers = authHeaders();
	if (!headers) {
		return Promise.reject(new Error('auth.refresh.no-credentials'));
	}
	return client.auth
		.refresh({}, { headers, fetchClient: authenticatedCoreApiClient() })
		.then(throwError({ onSuccess: (tr: TokenResponse) => setCredentials({ token: tr.token }) }));
};
