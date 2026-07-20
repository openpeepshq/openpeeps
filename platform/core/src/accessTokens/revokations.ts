import { RedisClientType } from 'redis';
import { getConnection } from '../redis';
import { get } from 'http';

const revocationsBloomFilterKey = 'revocations:bloom-filter';

const initRevocationsBloomFilter = async () => {
  const connection = await getConnection();
  if (!(await connection.exists(revocationsBloomFilterKey))) {
    await connection.bf.reserve(revocationsBloomFilterKey, 0.01, 1000);
  }
  return connection;
};

let bfConnection: RedisClientType | undefined = undefined;

const getBloomFilterConnection = async () => {
  if (!bfConnection) {
    bfConnection = await initRevocationsBloomFilter();
  }
  return bfConnection;
};

export const addToBloomFilter = (id: string) =>
  getBloomFilterConnection().then((redis) =>
    redis.bf.add(revocationsBloomFilterKey, id),
  );

export const isMaybeRevoked = (id: string) =>
  getBloomFilterConnection().then((redis) =>
    redis.bf.exists(revocationsBloomFilterKey, id),
  );
