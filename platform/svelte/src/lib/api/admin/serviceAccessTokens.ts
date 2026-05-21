import { client, noPayloadMutation, payloadMutation, simpleStore } from '../helpers';

export const adminServiceAccessTokensStore = () =>
  simpleStore(client.admin.serviceAccessTokens.list);

export const createAdminServiceAccessTokenMutation = payloadMutation(
  client.admin.serviceAccessTokens.create,
  {
    queryKeys: [['admin', 'serviceAccessTokens']],
  },
);

export const revokeAdminServiceAccessTokenMutation = noPayloadMutation(
  client.admin.serviceAccessTokens.revoke,
  {
    queryKeys: [['admin', 'serviceAccessTokens']],
  },
);
