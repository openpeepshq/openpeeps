import {
  decodeJwt,
  decodeProtectedHeader,
  importJWK,
  jwtVerify,
  type JWTPayload,
} from "jose";
import { authorizationSchema } from "../types/auth";
import type { Scope } from "../types/models";

export const decodeJwtPayloadUnverified = (token: string): JWTPayload =>
  decodeJwt(token);

/**
 * Reads `scopes` from a JWT by validating the payload as {@link Authorization} (no signature verification).
 * Session and access tokens embed that shape in the claim set.
 */
export const parseScopesFromJwt = (
  token: string | undefined | null,
): Scope[] => {
  if (!token?.trim()) {
    return [];
  }
  try {
    const parsed = authorizationSchema.safeParse(decodeJwt(token));
    return parsed.success ? parsed.data.scopes : [];
  } catch {
    return [];
  }
};

/**
 * True when the token has a numeric `exp`, is not expired yet, and seconds until expiry is at least
 * `minRemainingSeconds`. Non-finite or negative `minRemainingSeconds` yields false. Invalid or undecodable
 * tokens return false.
 */
export const jwtHasRemainingValidityAtLeast = (
  token: string | undefined | null,
  minRemainingSeconds: number,
): boolean => {
  if (
    !Number.isFinite(minRemainingSeconds) ||
    minRemainingSeconds < 0 ||
    !token?.trim()
  ) {
    return false;
  }
  try {
    const { exp } = decodeJwt(token);
    if (typeof exp !== "number") {
      return false;
    }
    const nowSec = Date.now() / 1000;
    return exp - nowSec >= minRemainingSeconds;
  } catch {
    return false;
  }
};

export const verifyJwt = async (
  token: string,
  publicKey: string,
): Promise<JWTPayload | undefined> => {
  const jwkPublicKey = await importJWK({
    kty: 'OKP',
    crv: 'Ed25519',
    x: publicKey,
  });
  const verification = await jwtVerify(token, jwkPublicKey, {
    algorithms: ['EdDSA'],
  }).catch(() => undefined);

  return verification?.payload;
};

export const parseJwtKeyId = (token: string): string | undefined => {
  try {
    const { kid } = decodeProtectedHeader(token);
    return typeof kid === 'string' ? kid : undefined;
  } catch {
    return undefined;
  }
};
