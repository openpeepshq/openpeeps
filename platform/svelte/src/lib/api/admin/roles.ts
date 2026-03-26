import { client, payloadMutation, simpleStore } from '../helpers';

export const getRolesListStore = () => simpleStore(client.admin.roles.list);
export const updateRoleMutation = payloadMutation(client.admin.roles.update, { queryKeys: [['admin', 'roles']] });
