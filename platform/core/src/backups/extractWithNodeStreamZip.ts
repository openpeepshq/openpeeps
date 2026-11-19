import StreamZip from 'node-stream-zip';

/**
 * node-stream-zip extraction, used on non-Linux platforms and as the fallback
 * when the unzip CLI is unavailable.
 *
 * node-stream-zip's `validateName()` rejects `../`, absolute, drive-letter, and
 * backslash entry names, and its extraction writes only regular files and
 * directories (never symlinks), so zip-slip and symlink-escape attacks
 * (GHSA-jmr9-qjv8-65gv / GHSA-7pqw-9j4j-h8q3) are neutralized at the root.
 *
 * @internal exposed for tests
 */
export const extractWithNodeStreamZip = (
  zipPath: string,
  tempDir: string,
): { promise: Promise<void>; kill: () => void } => {
  let zip: InstanceType<typeof StreamZip.async> | undefined;
  // Flipped once the reader has finished opening (header read). node-stream-zip
  // only tolerates `close()` while a read is in flight; closing it before that
  // point is racy (it can resolve the read stream in a broken state and, in
  // 1.16.0, even throw an uncaught fs error inside its err-handling path — a
  // process crash).
  let open = false;
  let closed = false;
  const promise = (async () => {
    zip = new StreamZip.async({ file: zipPath });
    void zip.entriesCount
      .then(() => undefined)
      .catch(() => undefined)
      .then(() => {
        open = true;
      });
    try {
      await zip.extract(null, tempDir);
    } finally {
      await zip.close().catch(() => undefined);
    }
  })();
  return {
    promise,
    kill: () => {
      /* Best-effort cancel: closing the reader aborts the in-flight read —
         the extract promise rejects with an fs error (EBADF) and may leave a
         partial file in tempDir. The restore path's error handling already
         tolerates that (it logs and rethrows, with no tempDir cleanup —
         pre-existing behavior). Only effective once the reader is open;
         before that, kill() is a no-op and the extraction runs to completion
         (nothing is in flight to abort yet). Kill-once: repeated calls are
         ignored. */
      if (closed) return;
      closed = true;
      if (!open) return;
      void zip?.close().catch(() => undefined);
    },
  };
};
