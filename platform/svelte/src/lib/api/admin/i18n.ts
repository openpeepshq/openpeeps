import { client, payloadMutation, simpleStore } from '../helpers';

export const getI18nStore = () => simpleStore(client.admin.i18n.read);

export const updateI18nMutation = payloadMutation(client.admin.i18n.update, {
    queryKeys: [['admin', 'i18n'], ['i18n']]
});
