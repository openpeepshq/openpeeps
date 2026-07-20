import type { MediaStorage, MediaStorageParams } from '@openpeeps/common/types';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
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

  /**
   * Streaming reader sibling of {@link MediaStorage.getStream}.
   *
   * Uses `createReadStream` rather than `fs.open(...).readableWebStream()`:
   * the latter hands the FileHandle to the stream but immediately drops the
   * only reference to it, so on Node ≥22 the FileHandle can be
   * garbage-collected before the stream drains — Node emits a DEP0137
   * deprecation warning ("Closing a FileHandle object on garbage
   * collection") and a future major will throw outright. `createReadStream`
   * owns its file descriptor and closes it deterministically on `'end'` or
   * `'error'` (`autoClose` defaults to true).
   *
   * Bound to the interface type via `MediaStorage['getStream']` so the cast
   * lands in the same place as `storeStream` does for the input direction —
   * `Readable.toWeb` returns a `node:stream/web.ReadableStream` which is
   * structurally identical to the DOM lib's `ReadableStream` but rejected by
   * TypeScript across the boundary.
   */
  const getStream: MediaStorage['getStream'] = async (id) =>
    Readable.toWeb(
      createReadStream(storagePath + '/' + id),
    ) as unknown as ReturnType<MediaStorage['getStream']> extends Promise<
      infer R
    >
      ? R
      : never;

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
    getStream,
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
