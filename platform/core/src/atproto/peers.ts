import { hostIsAllowed } from '@openpeepshq/common/lib';
import { config } from '../config';
import { getSharedConnection } from '../redis/connection';
import { logger } from '../log';

const log = logger('app:atproto:peers');

export const hostnameOf = (value: string | string[] | URL): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null) return null;
  try {
    const host = new URL(raw).hostname.trim().toLowerCase().replace(/\.$/, '');
    return host || null;
  } catch {
    return null;
  }
};

export const pdsHostAllowed = async (
  value: string | URL | null | undefined,
): Promise<boolean> => {
  if (value == null) return false;
  const host = hostnameOf(
    typeof value === 'string' && !value.includes('://')
      ? `https://${value}`
      : value,
  );
  if (!host) return false;
  const cfg = await config();
  return hostIsAllowed(host, cfg.atproto.allowedPdsHosts);
};

export const atprotoIsActive = async (): Promise<boolean> =>
  (await config()).atproto.active;

export const atprotoIngestEnabled = async (): Promise<boolean> => {
  const cfg = await config();
  return cfg.atproto.active && cfg.atproto.ingestEnabled;
};

interface DidDocument {
  id: string;
  service?: Array<{ id: string; serviceEndpoint: string | string[] }>;
}

const DID_DOC_TTL = 3600; // 1 hour cache

export const resolveDidDocument = async (
  did: string,
): Promise<DidDocument | null> => {
  if (!did.startsWith('did:plc:') && !did.startsWith('did:web:')) {
    return null;
  }

  const redis = await getSharedConnection();
  const cacheKey = `atproto:did:${did}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as DidDocument;
    }
  } catch {
    // Redis unavailable, continue without cache
  }

  let doc: DidDocument | null = null;

  if (did.startsWith('did:plc:')) {
    try {
      const cfg = await config();
      const plcUrl = cfg.atproto.plcDirectory || 'https://plc.directory';
      const resp = await fetch(`${plcUrl}/${did}`);
      if (resp.ok) {
        doc = (await resp.json()) as DidDocument;
      }
    } catch (err) {
      log.warn({ did, err }, 'failed to resolve DID from PLC');
    }
  } else if (did.startsWith('did:web:')) {
    try {
      const webPart = did.replace('did:web:', '');
      const url = `https://${webPart}/.well-known/did.json`;
      const resp = await fetch(url);
      if (resp.ok) {
        doc = (await resp.json()) as DidDocument;
      }
    } catch (err) {
      log.warn({ did, err }, 'failed to resolve DID from web');
    }
  }

  if (doc) {
    try {
      const redis = await getSharedConnection();
      await redis.set(cacheKey, JSON.stringify(doc), { EX: DID_DOC_TTL });
    } catch {
      // Redis unavailable
    }
  }

  return doc;
};

export interface IngestGuardResult {
  allowed: boolean;
  reason?: string;
}

export const canIngestFrom = async (
  did: string,
  pdsEndpoint: string,
  sourceHost: string,
  handleDomain: string,
): Promise<IngestGuardResult> => {
  // 1. Source host must be allowlisted
  if (!(await pdsHostAllowed(sourceHost))) {
    return { allowed: false, reason: 'source host not allowlisted' };
  }

  // 2. Resolve DID document and verify PDS endpoint matches source
  const doc = await resolveDidDocument(did);
  if (!doc) {
    return { allowed: false, reason: 'could not resolve DID document' };
  }

  const didPdsHost = doc.service?.find(
    (s) => s.id === '#atproto_pds',
  )?.serviceEndpoint;
  if (!didPdsHost) {
    return {
      allowed: false,
      reason: 'DID document missing atproto_pds service',
    };
  }

  const resolvedHost = hostnameOf(didPdsHost);
  if (!resolvedHost || resolvedHost !== sourceHost) {
    return {
      allowed: false,
      reason: `DID PDS endpoint (${resolvedHost}) does not match source host (${sourceHost})`,
    };
  }

  // 3. Reject DIDs belonging to our own handleDomain
  if (resolvedHost.includes(handleDomain)) {
    return { allowed: false, reason: 'DID belongs to our own domain' };
  }

  return { allowed: true };
};
