import { createClient, RedisClientType } from 'redis';
import { defaultConfig } from '../config/defaults/core';

export const getConnection = () =>
  createClient({
    url: `redis://${defaultConfig.redis.host}:6379`,
  })
    .on('error', console.log)
    .connect() as Promise<RedisClientType>;

export const disconnect = async (conn: RedisClientType) => {
  conn.isOpen && (await conn.disconnect().catch(console.error));
};

let connection: Promise<RedisClientType> | undefined;
export const getSharedConnection = async () => {
  if (!(connection && (await connection).isOpen)) {
    connection = getConnection();
  }
  return connection;
};

