import { client, simpleStore } from '../helpers';

export const adminServerStatsStore = () => simpleStore(client.admin.stats.general);
