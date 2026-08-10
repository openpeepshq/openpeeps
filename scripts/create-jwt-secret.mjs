#!/usr/bin/env node
/**
 * Mint a JWT_SECRET for local/host bootstrap without loading @openpeepshq/core.
 *
 * Usage: node scripts/create-jwt-secret.mjs
 * Same output as: opc secrets create-jwt-secret
 */
import { createJwtSecret } from '../platform/cli/bin/createJwtSecret.mjs';

process.stdout.write(`${createJwtSecret()}\n`);
