import { randomBytes } from 'node:crypto';

/** 64 random bytes as base64url — same format as `opc secrets create-jwt-secret`. */
export const createJwtSecret = () => randomBytes(64).toString('base64url');
