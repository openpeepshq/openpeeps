import { createHash, verify } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { z } from '@openpeepshq/common/zod';
import * as tar from 'tar';
import {
  pluginStoreListingSchema,
  type PluginStoreCatalog,
} from '@openpeepshq/common/types';

export const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
export const MAX_EXTRACTED_BYTES = 1024 * 1024 * 1024;
const MAX_CATALOG_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60_000;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The operator-pinned catalog origin; undefined disables the store. */
export const pluginStoreUrl = (): URL | undefined => {
  const raw = process.env.PLUGIN_STORE_URL?.trim();
  if (!raw) return undefined;
  const url = new URL(raw);
  const secure =
    url.protocol === 'https:' ||
    (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname));
  if (!secure || url.username || url.password) {
    throw new Error(
      'PLUGIN_STORE_URL must be an https URL without credentials.',
    );
  }
  return url;
};

/** The operator-pinned Ed25519 key (PEM); never taken from the store origin. */
export const pluginStorePublicKey = (): string | undefined =>
  process.env.PLUGIN_STORE_PUBLIC_KEY?.trim().replace(/\\n/g, '\n') ||
  undefined;

const storeEndpoint = (base: URL, route: string) =>
  new URL(`${base.pathname.replace(/\/$/, '')}${route}`, base);

const storeFetch = (url: URL, init: RequestInit = {}) =>
  fetch(url, {
    ...init,
    // A redirect would let the store origin point the installer elsewhere.
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

const readCapped = async (response: Response, max: number) => {
  if (Number(response.headers.get('content-length')) > max) {
    throw new Error('Plugin store response is larger than the allowed size.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Plugin store response has no body.');
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new Error('Plugin store response is larger than the allowed size.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
};

export type StoreArtifact = {
  listing: string;
  version: string;
  sha256: string;
};

/**
 * Signed over UTF-8 `listing\nversion\nsha256` (lowercase hex of the raw
 * tarball bytes) so an artifact cannot be replayed under another listing or
 * version. An unparsable key or signature is a failed verification.
 */
export const verifyStoreSignature = (
  publicKeyPem: string,
  { listing, version, sha256 }: StoreArtifact,
  signatureBase64: string,
): boolean => {
  try {
    return verify(
      null,
      Buffer.from(`${listing}\n${version}\n${sha256}`, 'utf8'),
      publicKeyPem,
      Buffer.from(signatureBase64, 'base64'),
    );
  } catch {
    return false;
  }
};

export const getPluginStoreCatalog = async (): Promise<PluginStoreCatalog> => {
  const base = pluginStoreUrl();
  if (!base) return { enabled: false, installable: false, listings: [] };
  const response = await storeFetch(storeEndpoint(base, '/v1/listings'));
  if (!response.ok) {
    throw new Error(`Plugin store catalog failed (HTTP ${response.status}).`);
  }
  const listings = z
    .array(pluginStoreListingSchema)
    .parse(
      JSON.parse((await readCapped(response, MAX_CATALOG_BYTES)).toString()),
    );
  return {
    enabled: true,
    installable: Boolean(pluginStorePublicKey()),
    listings: listings.filter((listing) => listing.latest),
  };
};

const grantSchema = z.object({
  token: z.string().min(1),
  listing: z.string(),
  version: z.string(),
  sha256: z.string(),
});

/** Entitlements are per instance, so the store is told this instance's origin. */
const instanceOrigin = async () => {
  // Loaded lazily: the server module pulls in the database, which the
  // install path must not need until a store install actually runs.
  const { serverRootUrl } = await import('../server');
  return serverRootUrl();
};

export const downloadStoreArtifact = async (
  listing: string,
  version: string,
): Promise<Buffer> => {
  const base = pluginStoreUrl();
  if (!base) {
    throw new Error('The plugin store is not enabled (PLUGIN_STORE_URL).');
  }
  const publicKey = pluginStorePublicKey();
  if (!publicKey) {
    throw new Error(
      'Store installs are disabled until PLUGIN_STORE_PUBLIC_KEY is set.',
    );
  }

  const entitlement = await storeFetch(
    storeEndpoint(base, '/v1/entitlements'),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        listing,
        version,
        origin: await instanceOrigin(),
      }),
    },
  );
  if (entitlement.status === 402) {
    throw new Error(
      `Purchase "${listing}" in the plugin store before installing.`,
    );
  }
  if (!entitlement.ok) {
    throw new Error(
      `Plugin store refused the install (HTTP ${entitlement.status}).`,
    );
  }
  const grant = grantSchema.parse(await entitlement.json());
  if (grant.listing !== listing || grant.version !== version) {
    throw new Error('Plugin store granted a different listing or version.');
  }

  const artifact = await storeFetch(
    storeEndpoint(
      base,
      `/v1/artifacts/${listing}/${encodeURIComponent(version)}`,
    ),
    { headers: { authorization: `Bearer ${grant.token}` } },
  );
  if (!artifact.ok) {
    throw new Error(`Plugin store download failed (HTTP ${artifact.status}).`);
  }
  const bytes = await readCapped(artifact, MAX_ARCHIVE_BYTES);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const signature = artifact.headers.get('x-openpeeps-signature') ?? '';
  if (
    sha256 !== grant.sha256 ||
    !verifyStoreSignature(publicKey, { listing, version, sha256 }, signature)
  ) {
    throw new Error('Plugin store artifact failed signature verification.');
  }
  return bytes;
};

const unsafeMember = (entry: tar.ReadEntry): string | undefined => {
  if (entry.type !== 'File' && entry.type !== 'Directory') {
    return `${entry.type} entries are not allowed`;
  }
  const segments = entry.path.split('/').filter(Boolean);
  if (
    entry.path.startsWith('/') ||
    entry.path.includes('\\') ||
    entry.path.includes('\0') ||
    /^[A-Za-z]:/.test(entry.path) ||
    segments.length === 0 ||
    segments.includes('..')
  ) {
    return 'path must be relative and stay inside the archive';
  }
  return undefined;
};

/** Rejects the archive before anything is written to disk. */
const validateMembers = (archive: Buffer): Promise<void> =>
  new Promise((resolve, reject) => {
    let extracted = 0;
    let root: string | undefined;
    const parser = new tar.Parser({
      onReadEntry: (entry) => {
        const [top = ''] = entry.path.split('/');
        root ??= top;
        extracted += entry.size;
        const problem =
          unsafeMember(entry) ??
          (top === root
            ? undefined
            : 'members must share one top-level directory') ??
          (extracted > MAX_EXTRACTED_BYTES
            ? 'extracted size is too large'
            : undefined);
        if (problem) {
          parser.abort(
            new Error(`Unsafe plugin archive: ${entry.path}: ${problem}`),
          );
        }
        entry.resume();
      },
    });
    parser.on('error', reject);
    parser.on('end', resolve);
    parser.end(archive);
  });

/**
 * Extracts a validated store tarball into destination, dropping the single
 * top-level directory (`package/` in `npm pack` output).
 */
export const extractStoreArchive = async (
  archive: Buffer,
  destination: string,
): Promise<void> => {
  await validateMembers(archive);
  await pipeline(
    Readable.from(archive),
    tar.extract({ cwd: destination, strip: 1, strict: true }),
  );
};
