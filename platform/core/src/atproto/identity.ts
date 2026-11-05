import { createHash } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { Secp256k1Keypair } from '@atproto/crypto';
import { config } from '../config';
import { pgDb } from '../db/pg/client';
import { profiles } from '../db/pg/schema/documents';
import { atprotoIsActive } from './peers';

export const atprotoOrigin = (domain: string) => `https://${domain}`;

export const sanitizeAtHandleLabel = (handle: string) => {
  const label = handle
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .slice(0, 63);
  return label.length > 0 ? label : 'user';
};

export const atHandleFor = (handle: string, domain: string) =>
  `${sanitizeAtHandleLabel(handle)}.${domain}`;

export const isPublicHandleDomain = (domain: string) =>
  domain !== 'localhost' &&
  !domain.endsWith('.localhost') &&
  !domain.endsWith('.test');

export const handleWellKnownUrl = (atHandle: string) =>
  `https://${atHandle}/.well-known/atproto-did`;

/** Triggers Traefik/ACME for `{handle}.{handleDomain}` after mint. */
export const warmHandleWellKnown = (atHandle: string, domain: string) => {
  if (!isPublicHandleDomain(domain)) return;
  void fetch(handleWellKnownUrl(atHandle)).catch(() => undefined);
};

export const didWebForHandle = (domain: string, handle: string) =>
  `did:web:${domain}:atproto:users:${sanitizeAtHandleLabel(handle)}`;

export const didDocumentPath = (handle: string) =>
  `/atproto/users/${sanitizeAtHandleLabel(handle)}/did.json`;

export const didDocumentUrl = (domain: string, handle: string) =>
  `${atprotoOrigin(domain)}${didDocumentPath(handle)}`;

export const pdsServiceEndpoint = (domain: string) => atprotoOrigin(domain);

export const handleFromAtHandle = (atHandle: string, domain: string) => {
  const suffix = `.${domain.toLowerCase()}`;
  const normalized = atHandle.trim().toLowerCase();
  if (!normalized.endsWith(suffix)) return null;
  const label = normalized.slice(0, -suffix.length);
  if (!label || label.includes('.')) return null;
  return label;
};

export const generateAtprotoKeyPair = async () => {
  const keypair = await Secp256k1Keypair.create({ exportable: true });
  return {
    publicKeyDid: keypair.did(),
    privateKey: Buffer.from(await keypair.export()).toString('base64'),
  };
};

export const importAtprotoKeyPair = async (privateKey: string) =>
  Secp256k1Keypair.import(Buffer.from(privateKey, 'base64'), {
    exportable: true,
  });

export const buildDidDocument = (input: {
  did: string;
  handle: string;
  domain: string;
  publicKeyDid: string;
}) => ({
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/multikey/v1',
  ],
  id: input.did,
  alsoKnownAs: [`at://${atHandleFor(input.handle, input.domain)}`],
  verificationMethod: [
    {
      id: `${input.did}#atproto`,
      type: 'Multikey',
      controller: input.did,
      publicKeyMultibase: input.publicKeyDid.replace(/^did:key:/, ''),
    },
  ],
  service: [
    {
      id: '#atproto_pds',
      type: 'AtprotoPersonalDataServer',
      serviceEndpoint: pdsServiceEndpoint(input.domain),
    },
  ],
});

export const instanceDidWeb = (domain: string) => `did:web:${domain}`;

export const buildInstanceDidDocument = (domain: string) => ({
  '@context': ['https://www.w3.org/ns/did/v1'],
  id: instanceDidWeb(domain),
  service: [
    {
      id: '#atproto_pds',
      type: 'AtprotoPersonalDataServer',
      serviceEndpoint: pdsServiceEndpoint(domain),
    },
  ],
});

export type LocalAtprotoIdentity = {
  id: string;
  handle: string;
  did: string;
  atHandle: string;
  publicKeyDid: string;
  privateKey: string;
};

export const localAtprotoScalars = async (handle: string, domain: string) => {
  const keys = await generateAtprotoKeyPair();
  const label = sanitizeAtHandleLabel(handle);
  return {
    did: didWebForHandle(domain, label),
    atHandle: atHandleFor(label, domain),
    pdsEndpoint: pdsServiceEndpoint(domain),
    atSigningPublicKey: keys.publicKeyDid,
    atSigningPrivateKey: keys.privateKey,
  };
};

export const backfillLocalAtprotoIdentities = async () => {
  if (!(await atprotoIsActive())) return;
  const db = pgDb();
  const domain = (await config()).atproto.handleDomain;
  const locals = await db
    .select({ id: profiles.id, handle: profiles.handle })
    .from(profiles)
    .where(
      and(
        eq(profiles.type, 'local'),
        isNull(profiles.did),
        isNull(profiles.deletedAt),
      ),
    );
  for (const row of locals) {
    await db
      .update(profiles)
      .set(await localAtprotoScalars(row.handle, domain))
      .where(eq(profiles.id, row.id));
  }
};

export const loadLocalAtprotoIdentity = async (
  handleOrDid: string,
): Promise<LocalAtprotoIdentity | null> => {
  const db = pgDb();
  const domain = (await config()).atproto.handleDomain;
  const atHandle = handleOrDid.includes('.')
    ? handleOrDid.toLowerCase()
    : handleOrDid.startsWith('did:')
      ? null
      : atHandleFor(handleOrDid, domain);
  const [row] = await db
    .select({
      id: profiles.id,
      handle: profiles.handle,
      type: profiles.type,
      did: profiles.did,
      atHandle: profiles.atHandle,
      atSigningPublicKey: profiles.atSigningPublicKey,
      atSigningPrivateKey: profiles.atSigningPrivateKey,
      deletedAt: profiles.deletedAt,
    })
    .from(profiles)
    .where(
      and(
        eq(profiles.type, 'local'),
        isNull(profiles.deletedAt),
        handleOrDid.startsWith('did:')
          ? eq(profiles.did, handleOrDid)
          : atHandle
            ? eq(profiles.atHandle, atHandle)
            : eq(profiles.handle, handleOrDid),
      ),
    )
    .limit(1);
  if (
    !row?.did ||
    !row.atHandle ||
    !row.atSigningPublicKey ||
    !row.atSigningPrivateKey
  ) {
    return null;
  }
  return {
    id: row.id,
    handle: row.handle,
    did: row.did,
    atHandle: row.atHandle,
    publicKeyDid: row.atSigningPublicKey,
    privateKey: row.atSigningPrivateKey,
  };
};

export const findProfileIdByDid = async (
  did: string,
): Promise<string | null> => {
  const db = pgDb();
  const [row] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.did, did), isNull(profiles.deletedAt)))
    .limit(1);
  return row?.id ?? null;
};

/** Separate from community JWT so AT tokens fail Riddl verification. */
export const atprotoJwtSeed = (jwtSecret: string) =>
  createHash('sha256').update(`${jwtSecret}:atproto`).digest();
