import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { errors, importJWK, jwtVerify, type JWK, type JWTPayload } from 'jose';
import {
  ATPROTO_ACCESS_SCOPE,
  dpopThumbprint,
  type AtprotoSessionClaims,
  verifyAtprotoAccess,
} from '@openpeepshq/core/atproto';
import { getSharedConnection } from '@openpeepshq/core/redis';
import { logger } from '@openpeepshq/core/log';
import { authRequired, invalidRequest } from './errors';

const log = logger('server:atproto:auth');

/** RFC 9449 proof freshness window: past/future skew both bounded. */
const ATPROTO_DPOP_MAX_AGE_SEC = 60;
const ATPROTO_DPOP_MAX_FUTURE_SEC = 5;
const ATPROTO_DPOP_JTI_TTL_SEC = 60;

const dpopJtiKey = (jti: string) => `atproto:dpop:jti:${jti}`;

/** Protected header of a DPoP proof (RFC 9449 §2.1). */
type DpopProofHeader = {
  jwk?: JWK;
  alg?: string;
  typ?: string;
  htm?: string;
  htu?: string;
};

/**
 * The expected failures of `importJWK` / `jwtVerify` are jose's `JOSEError`
 * subclasses (malformed JWK, bad signature, invalid JWT) — those stay silent
 * validation rejections. Anything else (a crypto backend failure, an
 * unexpected throw from inside jose) is a system error, not a bad proof: log
 * it so it cannot be swallowed silently, and still reject.
 */
const joseErrorOrLog = (phase: string, error: unknown): undefined => {
  if (!(error instanceof errors.JOSEError)) {
    log.error(`DPoP validation (${phase}) raised an unexpected error`, error);
  }
  return undefined;
};

/**
 * Consumes the replay marker for a proof `jti`. Returns true the first time a
 * `jti` is seen and false on any later attempt, so a replayed (or in-flight
 * duplicate) proof is rejected while the 60s TTL bounds the keyset.
 *
 * The `jti` alone identifies the key, but a replay attempt is never keyed on
 * `jti` alone: `verifyDpop` first binds the proof's `htm` to the request
 * method and `htu` to its origin+pathname (RFC 9449 §4.3) and verifies the
 * proof signature with the `jwk` embedded in its header, all before this
 * lookup. A captured proof replayed against a different method or path
 * therefore fails those guards, and a re-issued proof is rejected by the
 * signature check — the `jti` marker is the final backstop for an exact
 * replay of an otherwise-valid proof.
 */
const consumeDpopJti = async (jti: string): Promise<boolean> => {
  const redis = await getSharedConnection();
  const result = await redis.set(dpopJtiKey(jti), '1', {
    NX: true,
    EX: ATPROTO_DPOP_JTI_TTL_SEC,
  });
  return result !== null;
};

/** Parse the proof header and check its static fields (alg, typ, jwk). */
const parseProofHeader = (proof: string): DpopProofHeader | undefined => {
  const parts = proof.split('.');
  if (parts.length !== 3) return undefined;
  let header: DpopProofHeader;
  try {
    header = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString(),
    ) as DpopProofHeader;
  } catch {
    return undefined;
  }
  if (!header.jwk || header.alg !== 'ES256') return undefined;
  if (header.typ !== 'dpop+jwt') return undefined;
  return header;
};

/** Bind `htm` to the request method and `htu` to its URI (RFC 9449 §4.3). */
const validateHtmHtu = (header: DpopProofHeader, req: Request): boolean => {
  const method = req.method.toUpperCase();
  if (header.htm !== method) return false;
  const host = req.get('host');
  if (!host) return false;
  // RFC 9449 §4.3: compare htu against the request URI ignoring query and
  // fragment. Upstream normalizes both sides to origin + pathname.
  const u = new URL(req.originalUrl, `${req.protocol}://${host}`);
  return header.htu === `${u.origin}${u.pathname}`;
};

/** Check `iat` freshness; returns the proof `jti` when both it and `jti` hold. */
const validateProofTiming = (
  payload: JWTPayload,
  now: number,
): string | undefined => {
  const iat = payload.iat;
  if (
    typeof iat !== 'number' ||
    iat < now - ATPROTO_DPOP_MAX_AGE_SEC ||
    iat > now + ATPROTO_DPOP_MAX_FUTURE_SEC
  ) {
    return undefined;
  }
  const jti = payload.jti;
  if (typeof jti !== 'string' || jti.length === 0) return undefined;
  return jti;
};

/**
 * Bind a present `ath` to the presented access token.
 *
 * RFC 9449 §7: a proof presented with a DPoP-bound access token MUST carry
 * `ath` — the base64url SHA-256 of that token (defined at §4.2). When a proof
 * carries an `ath`, §4.3 (check 12) binds it: a mismatching `ath` is rejected
 * so a captured proof cannot survive an access-token rotation within the
 * replay window. A proof that carries no `ath` is a client-side violation of
 * the §7 MUST; the server accepts it here as a deliberate compatibility
 * deviation from the RFC — rather than 401-ing clients that pre-date the
 * binding — and the `ath-absent` test in auth.test.ts pins this behavior.
 */
const validateAthBinding = (payload: JWTPayload, req: Request): boolean => {
  const ath = payload.ath;
  if (typeof ath !== 'string' || ath.length === 0) return true;
  const authorization = req.headers.authorization;
  const token =
    typeof authorization === 'string' ? authorization.split(' ')[1] : undefined;
  if (!token) return false;
  const expectedAth = createHash('sha256').update(token).digest('base64url');
  return ath === expectedAth;
};

/** Bind the proof key to the token's `cnf.jkt`; returns the key's `jkt`. */
const validateJktBinding = async (
  header: DpopProofHeader,
  expectedJkt?: string,
): Promise<string | undefined> => {
  const jkt = await dpopThumbprint(header.jwk!);
  if (expectedJkt && jkt !== expectedJkt) return undefined;
  return jkt;
};

/**
 * Verifies the DPoP proof carried by `req` against RFC 9449 §4.3. Returns the
 * proof key's `jkt` (RFC 7638 thumbprint) when the proof is valid, otherwise
 * `undefined`.
 *
 * A failure to reach the replay store (Redis outage) propagates as a thrown
 * error rather than rejecting the proof: the replay backstop must never fail
 * open.
 */
export const verifyDpop = async (
  req: Request,
  expectedJkt?: string,
): Promise<string | undefined> => {
  const proof = req.headers.dpop;
  if (typeof proof !== 'string') return undefined;
  const header = parseProofHeader(proof);
  if (!header) return undefined;
  if (!validateHtmHtu(header, req)) return undefined;
  const key = await importJWK(header.jwk!, header.alg).catch((error: unknown) =>
    joseErrorOrLog('importJWK', error),
  );
  if (!key) return undefined;
  const verified = await jwtVerify(proof, key, {
    algorithms: ['ES256'],
  }).catch((error: unknown) => joseErrorOrLog('jwtVerify', error));
  if (!verified) return undefined;
  const jti = validateProofTiming(
    verified.payload,
    Math.floor(Date.now() / 1000),
  );
  if (!jti) return undefined;
  if (!validateAthBinding(verified.payload, req)) return undefined;
  // Bind the proof key to the token's `cnf.jkt` before consuming the `jti`,
  // so only a fully-valid proof spends a `jti` slot. A mismatched `jkt` would
  // otherwise consume the slot and cause the next legitimate proof with the
  // same `jti` to be rejected as a replay.
  const jkt = await validateJktBinding(header, expectedJkt);
  if (!jkt) return undefined;
  const fresh = await consumeDpopJti(jti);
  if (!fresh) {
    log.info(`Rejected replayed DPoP proof (jti=${jti.slice(0, 8)}…)`);
    return undefined;
  }
  return jkt;
};

export const bearerToken = (req: Request) => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [rawScheme, token] = header.split(' ');
  if (!token) return null;
  // RFC 6750 §2.1: the authentication scheme is case-insensitive, so
  // canonicalize the case here instead of comparing raw client casing.
  const lower = rawScheme.toLowerCase();
  if (lower !== 'bearer' && lower !== 'dpop') return null;
  const scheme = lower === 'bearer' ? 'Bearer' : 'DPoP';
  return { scheme, token };
};

export const requireAtprotoSession = async (
  req: Request,
  res: Response,
): Promise<AtprotoSessionClaims | undefined> => {
  const parsed = bearerToken(req);
  if (!parsed) {
    authRequired(res);
    return undefined;
  }
  const claims = await verifyAtprotoAccess(parsed.token);
  if (!claims || claims.scope !== ATPROTO_ACCESS_SCOPE) {
    authRequired(res, 'Invalid AT Protocol session');
    return undefined;
  }
  if (claims.jkt) {
    if (parsed.scheme === 'DPoP' && typeof req.headers.dpop !== 'string') {
      invalidRequest(res, 'DPoP header required');
      return undefined;
    }
    if (parsed.scheme !== 'DPoP') {
      // The access token is bound to a DPoP key (cnf.jkt): it may only be
      // presented with a DPoP proof, so a plain Bearer request is rejected.
      authRequired(res, 'DPoP proof required');
      return undefined;
    }
    const jkt = await verifyDpop(req, claims.jkt);
    if (!jkt) {
      authRequired(res, 'DPoP proof required');
      return undefined;
    }
  }
  return claims;
};

export const requireDpopOnToken = async (req: Request, res: Response) => {
  const jkt = await verifyDpop(req);
  if (!jkt) {
    invalidRequest(res, 'DPoP header required');
    return undefined;
  }
  return jkt;
};
