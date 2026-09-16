import { createClient, RedisClientType } from 'redis';
import { defaultConfig } from '../config/defaults/core';

const clients = new Set<{ disconnect: () => Promise<unknown> }>();

export const getConnection = () => {
  const client = createClient({
    url: `redis://${defaultConfig.redis.host}:6379`,
  });
  client.on('error', console.log);
  clients.add(client);
  return client.connect() as Promise<RedisClientType>;
};

export const disconnect = async (conn: RedisClientType) => {
  if (conn.isOpen) {
    await conn.disconnect().catch(console.error);
  }
};

/** CLI exit: hub.on / getSharedConnection leave node-redis sockets open. */
export const closeRedisConnections = async () => {
  connection = undefined;
  await Promise.all(
    [...clients].map(async (conn) => {
      try {
        await conn.disconnect();
      } catch {
        // already closed
      }
    }),
  );
  clients.clear();
};

let connection: Promise<RedisClientType> | undefined;
export const getSharedConnection = async () => {
  if (!(connection && (await connection).isOpen)) {
    connection = getConnection();
  }
  return connection;
};
