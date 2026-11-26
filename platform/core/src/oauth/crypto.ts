import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const randomToken = (bytes = 32): string =>
  randomBytes(bytes).toString('base64url');

export const sha256Hex = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

// RFC 7636 §4.1–4.2: a S256 challenge is the 43-char base64url of a sha256.
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

export const isValidCodeChallenge = (challenge: string): boolean =>
  CHALLENGE.test(challenge);

export const verifyPkceS256 = (verifier: string, challenge: string): boolean =>
  VERIFIER.test(verifier) &&
  safeEqual(
    createHash('sha256').update(verifier).digest('base64url'),
    challenge,
  );
