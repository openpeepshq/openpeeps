import type { Request, Response } from 'express';
import { calculateJwkThumbprint, importJWK, jwtVerify } from 'jose';
import {
  ATPROTO_ACCESS_SCOPE,
  type AtprotoSessionClaims,
  verifyAtprotoAccess,
} from '@openpeepshq/core/atproto';
import { authRequired, invalidRequest } from './errors';

export const bearerToken = (req: Request) => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!token) return null;
  if (scheme !== 'Bearer' && scheme !== 'DPoP') return null;
  return { scheme, token };
};

export const verifyDpop = async (
  req: Request,
  expectedJkt?: string,
): Promise<string | undefined> => {
  const proof = req.headers.dpop;
  if (typeof proof !== 'string') {
    return expectedJkt ? undefined : undefined;
  }
  const [encoded] = proof.split('.');
  if (!encoded) return undefined;
  const header = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as {
    jwk?: { kty: string } & Record<string, unknown>;
    alg?: string;
  };
  if (!header.jwk || !header.alg) return undefined;
  const key = await importJWK(header.jwk, header.alg);
  const verified = await jwtVerify(proof, key).catch(() => undefined);
  if (!verified) return undefined;
  const jkt = await calculateJwkThumbprint(header.jwk);
  if (expectedJkt && jkt !== expectedJkt) return undefined;
  return jkt;
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
