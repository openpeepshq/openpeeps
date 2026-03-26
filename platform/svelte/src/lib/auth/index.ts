import type { IdentityContext } from '$lib/types';
import type { Credentials } from '@openpeeps/common/types';
import { getContext, setContext } from 'svelte';

export const credentialsStorageKey = 'credentials';

const currentIdentityContextKey = 'currentIdentity';


export const getCredentials = () =>
	JSON.parse(localStorage.getItem(credentialsStorageKey) || '{}') as Credentials;
export const setCredentials = (credentials: Credentials) => {
	localStorage.setItem(credentialsStorageKey, JSON.stringify(credentials));
};
export const clearCredentials = () => {
	localStorage.removeItem(credentialsStorageKey);
};
export const setToken = (token: string) => setCredentials({ ...getCredentials(), token });
export const clearToken = () => setToken('');

export const setCurrentIdentityContext = (identityContext: IdentityContext) =>
	setContext(currentIdentityContextKey, identityContext);

export const getCurrentProfile = () =>
	getContext<IdentityContext>(currentIdentityContextKey).profile;

export const getCurrentProfileSettings = () =>
	getContext<IdentityContext>(currentIdentityContextKey).profileSettings;

export const getCurrentAccount = () =>
	getContext<IdentityContext>(currentIdentityContextKey).account;

export const getCurrentIdentity = () =>
	getContext<IdentityContext>(currentIdentityContextKey);