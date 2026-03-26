import { getServerDataContext } from '$lib/components';

export const getServerInfo = () => getServerDataContext().serverInfo;
