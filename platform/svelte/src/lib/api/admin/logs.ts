import { client, simpleStore } from '../helpers';

export const adminLogsStore = (refetch: boolean) =>
	simpleStore(client.admin.logs.list, {
		refetchInterval: refetch ? 5000 : undefined
	});
