import { client, noPayloadMutation, payloadMutation, simpleStore } from '../helpers';

export const getBackupsListStore = () => simpleStore(client.admin.backups.list);

export const createBackupMutation = noPayloadMutation(client.admin.backups.create, {
	queryKeys: [['admin', 'backups']]
});

export const restoreBackupMutation = payloadMutation(client.admin.backups.restore);
