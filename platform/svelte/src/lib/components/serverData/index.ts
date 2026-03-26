import { getContext } from 'svelte';
import type { ServerDataContext } from './types';

export { default as ServerDataProvider } from './ServerDataProvider.svelte';

export const getServerDataContext = () => getContext<ServerDataContext>('allpeep-server-data');