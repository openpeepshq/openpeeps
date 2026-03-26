import { client, simpleStore } from './helpers';

export const serverInfoStore = () => simpleStore(client.server.info);
