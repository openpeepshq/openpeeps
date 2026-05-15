import type { MediaStorage, MediaStorageParams } from '@openpeeps/common/types';
import { createHash, randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { serverRootUrl } from '../../server';

const allpeepStorage = async (
  params: MediaStorageParams,
): Promise<MediaStorage> => {
  const { path } = params;

  const storagePath = path + '/allpeep';

  await fs.mkdir(storagePath, { recursive: true });

  const rootUrl = await serverRootUrl();

  /**
   * Streaming sibling of {@link MediaStorage.store}. Consumes the incoming web
   * `ReadableStream` chunk-by-chunk, writing each chunk straight to a temp
   * file in `storagePath` while feeding the same bytes into a SHA-256 digest.
   * Once the stream completes the temp file is atomically renamed to its
   * content-addressed final name. This keeps peak memory bounded by the
   * highWaterMark of the write stream rather than the size of the upload.
   *
   * The type is sourced from {@link MediaStorage} so the implementation tracks
   * the interface's `ReadableStream` lib choice exactly — global vs.
   * `node:stream/web` resolution differs between packages and trying to
   * re-declare the parameter type here causes assignability errors.
   */
  const storeStream: MediaStorage['storeStream'] = async (stream) => {
    const tempPath = `${storagePath}/.tmp-${randomBytes(16).toString('hex')}`;
    const hash = createHash('sha256');
    let size = 0;

    const source = Readable.fromWeb(
      stream as unknown as import('node:stream/web').ReadableStream<Uint8Array>,
    );

    try {
      await pipeline(
        source,
        async function* (input) {
          for await (const chunk of input) {
            // pipeline can yield Buffer or string depending on encoding; force
            // through the Buffer path so the hash and byte count are correct.
            const buf =
              chunk instanceof Buffer
                ? chunk
                : Buffer.from(chunk as Uint8Array);
            hash.update(buf);
            size += buf.length;
            yield buf;
          }
        },
        createWriteStream(tempPath),
      );
    } catch (err) {
      await fs.unlink(tempPath).catch(() => {});
      throw err;
    }

    const key = hash.digest('base64url');
    const finalPath = `${storagePath}/${key}`;

    try {
      // POSIX rename is atomic and silently overwrites a same-content
      // (same-hash) sibling, giving us free deduplication.
      await fs.rename(tempPath, finalPath);
    } catch (err) {
      await fs.unlink(tempPath).catch(() => {});
      throw err;
    }

    return { key, size };
  };

  return {
    store: async (data: ArrayBuffer | SharedArrayBuffer) => {
      const hash = Buffer.from(
        await crypto.subtle.digest('SHA-256', data as ArrayBuffer),
      ).toString('base64url');
      await fs.writeFile(storagePath + '/' + hash, Buffer.from(data));
      return hash;
    },
    storeStream,
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
