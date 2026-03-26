import { getServerInfo } from '$lib/server';

export const getDefaultVisibility = () => getServerInfo().publicContent ? 'public' : 'local';