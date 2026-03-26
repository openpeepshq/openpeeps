import { client, simpleStore } from '../helpers';

export const adminGroupsStore = () => simpleStore(client.admin.groups.list);