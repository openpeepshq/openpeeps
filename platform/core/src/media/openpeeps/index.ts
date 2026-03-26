import type { MediaStorage, MediaStorageParams } from '@openpeeps/common/types';
import fs from 'fs/promises';
import { serverRootUrl } from '../../server';

const allpeepStorage = async (
  params: MediaStorageParams,
): Promise<MediaStorage> => {
  const { path } = params;

  const storagePath = path + '/allpeep';

  await fs.mkdir(storagePath, { recursive: true });

  const rootUrl = await serverRootUrl();

  return {
    store: async (data: ArrayBuffer | SharedArrayBuffer) => {
      const hash = Buffer.from(
        await crypto.subtle.digest('SHA-256', data as ArrayBuffer),
      ).toString('base64url');
      await fs.writeFile(storagePath + '/' + hash, Buffer.from(data));
      return hash;
    },
    getPath: (id, filename) =>
      `${rootUrl}${params.prefix}/allpeep/${id}/${filename}`,
    getStream: async (id) =>
      (await fs.open(storagePath + '/' + id)).readableWebStream(),
    getData: async (id: string) => {
      const data = await fs.readFile(storagePath + '/' + id);
      return data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      );
    },
    isLocal: () => true,
  };
};

export default allpeepStorage;
