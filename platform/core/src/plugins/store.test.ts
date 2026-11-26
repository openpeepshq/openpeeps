import {
  createHash,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server', () => ({
  serverRootUrl: async () => 'https://community.example',
}));

const {
  downloadStoreArtifact,
  extractStoreArchive,
  getPluginStoreCatalog,
  verifyStoreSignature,
} = await import('./store');

const pem = (key: KeyObject) =>
  key.export({ type: 'spki', format: 'pem' }).toString();

const signed = (
  privateKey: KeyObject,
  artifact: { listing: string; version: string; sha256: string },
) =>
  sign(
    null,
    Buffer.from(
      `${artifact.listing}\n${artifact.version}\n${artifact.sha256}`,
      'utf8',
    ),
    privateKey,
  ).toString('base64');

const sha256 = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');

const ustarHeader = (name: string, type: string, size: number) => {
  const isLink = type === '1' || type === '2';
  const block = Buffer.alloc(512);
  block.write(name, 0, 100);
  block.write('0000644\0', 100);
  block.write('0000000\0', 108);
  block.write('0000000\0', 116);
  block.write(`${size.toString(8).padStart(11, '0')}\0`, 124);
  block.write('00000000000\0', 136);
  block.fill(' ', 148, 156);
  block.write(type, 156);
  if (isLink) block.write('package/package.json', 157, 100);
  block.write('ustar\0', 257);
  block.write('00', 263);
  const checksum = block.reduce((total, byte) => total + byte, 0);
  block.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148);
  return block;
};

const member = (name: string, type = '0', body = '', declaredSize?: number) =>
  Buffer.concat([
    ustarHeader(name, type, declaredSize ?? body.length),
    Buffer.from(body.padEnd(Math.ceil(body.length / 512) * 512, '\0')),
  ]);

const archive = (...members: Buffer[]) =>
  gzipSync(Buffer.concat([...members, Buffer.alloc(1024)]));

describe('verifyStoreSignature', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const artifact = {
    listing: 'peeps/greeter',
    version: '1.0.0',
    sha256: sha256(Buffer.from('plugin')),
  };
  const signature = signed(privateKey, artifact);

  it('accepts the signature over listing, version and digest', () => {
    expect(verifyStoreSignature(pem(publicKey), artifact, signature)).toBe(
      true,
    );
  });

  it('rejects replays under another listing or version, and a changed digest', () => {
    const key = pem(publicKey);
    expect(
      verifyStoreSignature(
        key,
        { ...artifact, listing: 'peeps/other' },
        signature,
      ),
    ).toBe(false);
    expect(
      verifyStoreSignature(key, { ...artifact, version: '1.0.1' }, signature),
    ).toBe(false);
    expect(
      verifyStoreSignature(
        key,
        { ...artifact, sha256: sha256(Buffer.from('tampered')) },
        signature,
      ),
    ).toBe(false);
  });

  it('rejects a signature from another key and unparsable input', () => {
    const other = generateKeyPairSync('ed25519').publicKey;
    expect(verifyStoreSignature(pem(other), artifact, signature)).toBe(false);
    expect(verifyStoreSignature('not a key', artifact, signature)).toBe(false);
    expect(verifyStoreSignature(pem(publicKey), artifact, '%%%')).toBe(false);
  });
});

describe('extractStoreArchive', () => {
  let destination: string;

  beforeEach(async () => {
    destination = await fs.mkdtemp(path.join(os.tmpdir(), 'store-extract-'));
  });

  afterEach(async () => {
    await fs.rm(destination, { recursive: true, force: true });
  });

  it('extracts regular files and drops the top-level directory', async () => {
    await extractStoreArchive(
      archive(
        member('package/', '5'),
        member('package/package.json', '0', '{"name":"x"}'),
        member('package/dist/', '5'),
        member('package/dist/index.js', '0', 'export {}'),
      ),
      destination,
    );
    expect(
      await fs.readFile(path.join(destination, 'package.json'), 'utf8'),
    ).toBe('{"name":"x"}');
    expect(
      await fs.readFile(path.join(destination, 'dist/index.js'), 'utf8'),
    ).toBe('export {}');
  });

  it.each([
    ['a symlink', [member('package/link', '2')]],
    ['a hard link', [member('package/link', '1')]],
    ['a parent traversal', [member('package/../../evil.js', '0', 'x')]],
    ['an absolute path', [member('/etc/evil.js', '0', 'x')]],
    ['a backslash path', [member('package\\evil.js', '0', 'x')]],
    [
      'members outside one top-level directory',
      [member('package/a.js', '0', 'x'), member('other/b.js', '0', 'x')],
    ],
    [
      'an extracted size over the cap',
      [member('package/big.bin', '0', '', 2 * 1024 ** 3)],
    ],
  ])('rejects %s before writing anything', async (_label, members) => {
    await expect(
      extractStoreArchive(archive(...members), destination),
    ).rejects.toThrow(/Unsafe plugin archive/);
    expect(await fs.readdir(destination)).toEqual([]);
  });
});

describe('store download', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const bytes = Buffer.from('prebuilt-tarball');
  const grant = {
    token: 'one-shot',
    listing: 'peeps/greeter',
    version: '1.0.0',
    sha256: sha256(bytes),
  };
  const signature = signed(privateKey, grant);

  const stubStore = (overrides?: {
    entitlementStatus?: number;
    body?: Buffer;
    signature?: string;
    headers?: Record<string, string>;
  }) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL) => {
        if (url.pathname === '/v1/entitlements') {
          return Response.json(grant, {
            status: overrides?.entitlementStatus ?? 200,
          });
        }
        return new Response(overrides?.body ?? bytes, {
          headers: {
            'x-openpeeps-signature': overrides?.signature ?? signature,
            ...overrides?.headers,
          },
        });
      }),
    );

  beforeEach(() => {
    vi.stubEnv('PLUGIN_STORE_URL', 'https://plugins.example');
    vi.stubEnv('PLUGIN_STORE_PUBLIC_KEY', pem(publicKey));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns the artifact when digest and signature verify', async () => {
    stubStore();
    await expect(
      downloadStoreArtifact('peeps/greeter', '1.0.0'),
    ).resolves.toEqual(bytes);
    const requests = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(requests).toEqual([
      'https://plugins.example/v1/entitlements',
      'https://plugins.example/v1/artifacts/peeps/greeter/1.0.0',
    ]);
  });

  it('fails closed when the store URL or the pinned key is unset', async () => {
    stubStore();
    vi.stubEnv('PLUGIN_STORE_PUBLIC_KEY', '');
    await expect(
      downloadStoreArtifact('peeps/greeter', '1.0.0'),
    ).rejects.toThrow(/PLUGIN_STORE_PUBLIC_KEY/);
    vi.stubEnv('PLUGIN_STORE_URL', '');
    await expect(
      downloadStoreArtifact('peeps/greeter', '1.0.0'),
    ).rejects.toThrow(/PLUGIN_STORE_URL/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects tampered bytes and a signature from another key', async () => {
    stubStore({ body: Buffer.from('tampered-tarball') });
    await expect(
      downloadStoreArtifact('peeps/greeter', '1.0.0'),
    ).rejects.toThrow(/signature verification/);
    const forged = signed(generateKeyPairSync('ed25519').privateKey, grant);
    stubStore({ signature: forged });
    await expect(
      downloadStoreArtifact('peeps/greeter', '1.0.0'),
    ).rejects.toThrow(/signature verification/);
  });

  it('rejects a downloads over the compressed size cap', async () => {
    stubStore({ headers: { 'content-length': String(101 * 1024 * 1024) } });
    await expect(
      downloadStoreArtifact('peeps/greeter', '1.0.0'),
    ).rejects.toThrow(/larger than the allowed size/);
  });

  it('reports a paid listing that has no entitlement', async () => {
    stubStore({ entitlementStatus: 402 });
    await expect(
      downloadStoreArtifact('peeps/greeter', '1.0.0'),
    ).rejects.toThrow(/Purchase/);
  });

  it('refuses a plain-http store URL that is not loopback', async () => {
    vi.stubEnv('PLUGIN_STORE_URL', 'http://plugins.example');
    await expect(
      downloadStoreArtifact('peeps/greeter', '1.0.0'),
    ).rejects.toThrow(/https/);
  });
});

describe('getPluginStoreCatalog', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('is disabled and makes no request while the URL is unset', async () => {
    vi.stubEnv('PLUGIN_STORE_URL', '');
    vi.stubGlobal('fetch', vi.fn());
    await expect(getPluginStoreCatalog()).resolves.toEqual({
      enabled: false,
      installable: false,
      listings: [],
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lists published listings and reports installs unavailable without a key', async () => {
    vi.stubEnv('PLUGIN_STORE_URL', 'https://plugins.example');
    vi.stubEnv('PLUGIN_STORE_PUBLIC_KEY', '');
    const base = {
      title: 'Greeter',
      description: '',
      category: 'general',
      priceCents: 0,
      currency: 'usd',
      versions: [],
      reviews: [],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json([
          { ...base, id: 'peeps/greeter', latest: { version: '1.0.0' } },
          { ...base, id: 'peeps/unpublished', latest: null },
        ]),
      ),
    );
    const catalog = await getPluginStoreCatalog();
    expect(catalog.enabled).toBe(true);
    expect(catalog.installable).toBe(false);
    expect(catalog.listings.map((listing) => listing.id)).toEqual([
      'peeps/greeter',
    ]);
  });
});
