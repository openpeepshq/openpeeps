import { client, updateCredentialsWrapper } from './helpers';

export const authenticateGeneric = updateCredentialsWrapper(client.sso.generic.authenticate);
