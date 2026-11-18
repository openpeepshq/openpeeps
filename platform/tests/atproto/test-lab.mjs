#!/usr/bin/env node
/**
 * Tier 1 — lab interop scaffold.
 *
 * Probes getRepo (IPLD CAR) and subscribeRepos (CBOR WebSocket), then
 * documents the outbound client + allowlisted ingest checks to add once
 * a reference PDS / client compose exists. See
 * planning/at-protocol/bluesky-compat.md.
 *
 *   node test-lab.mjs
 *   ATPROTO_TIER1=1 node test-lab.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XrpcClient } from '@atproto/xrpc';
import { schemas } from '@atproto/api';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(here, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] == null) process.env[key] = value;
  }
}

const ORIGIN = (process.env.ATPROTO_ORIGIN ?? 'http://localhost:5173').replace(
  /\/$/,
  '',
);
const HANDLE_DOMAIN = process.env.ATPROTO_HANDLE_DOMAIN ?? 'localhost';
const STRICT = process.env.ATPROTO_TIER1 === '1';
const PEER_ORIGIN = process.env.PEER_ORIGIN;
const PEER_HOST = process.env.PEER_HOST;

const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const NC = '\x1b[0m';

const info = (msg) => console.log(`  ${YELLOW}…${NC} ${msg}`);
const pass = (msg) => console.log(`  ${GREEN}✓${NC} ${msg}`);
const fail = (msg) => console.log(`  ${RED}✗${NC} ${msg}`);

const laterChecks = [
  'Outbound: reference client createSession (or OAuth+DPoP) against our XRPC',
  'Outbound: getProfile / getAuthorFeed / getPostThread for {label}.{handleDomain}',
  'Outbound: createRecord(app.bsky.feed.post) appears in Riddl as visibility=public',
  'Inbound: peer host is on atproto.allowedPdsHosts',
  'Inbound: ingested app.bsky.feed.post keeps the remote at_uri (no second mint)',
  'Inbound: a host not on the allowlist is dropped',
];

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(' AT Protocol Tier 1 — lab interop (after CAR / firehose)');
console.log(` origin=${ORIGIN}  handleDomain=${HANDLE_DOMAIN}`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

let describe;
try {
  describe = await fetch(`${ORIGIN}/xrpc/com.atproto.server.describeServer`);
} catch (error) {
  fail(`Cannot reach ${ORIGIN}. Start the API (run-openpeeps) first.`);
  info(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
if (!describe.ok) {
  fail(
    `XRPC is not mounted (HTTP ${describe.status}). Enable atproto.active and restart.`,
  );
  process.exit(1);
}
pass('describeServer is reachable');

const xrpc = new XrpcClient(ORIGIN, schemas);
let repoDid;
try {
  const repos = await xrpc.call('com.atproto.sync.listRepos', { limit: 1 });
  repoDid = repos.data?.repos?.[0]?.did;
} catch (error) {
  info(`listRepos: ${error instanceof Error ? error.message : String(error)}`);
}

const gaps = [];

info('Probing com.atproto.sync.getRepo for an IPLD CAR...');
if (repoDid) {
  const repo = await fetch(
    `${ORIGIN}/xrpc/com.atproto.sync.getRepo?did=${encodeURIComponent(repoDid)}`,
  );
  const contentType = (repo.headers.get('content-type') ?? '').toLowerCase();
  const body = await repo.text();
  const looksCar =
    contentType.includes('application/vnd.ipld.car') ||
    contentType.includes('application/vnd.ipld.car;');
  const looksJson = contentType.includes('json') || body.trim().startsWith('{');
  if (looksCar && !looksJson) {
    pass(`getRepo returned CAR (${contentType})`);
  } else {
    gaps.push(
      `getRepo is ${contentType || 'untyped'} JSON snapshot, not application/vnd.ipld.car`,
    );
  }
} else {
  gaps.push('getRepo not probed (no repo from listRepos)');
}

info('Probing com.atproto.sync.subscribeRepos for CBOR WebSocket...');
const subscribeWs = `${ORIGIN.replace(/^http/, 'ws')}/xrpc/com.atproto.sync.subscribeRepos`;
try {
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(subscribeWs);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('timeout'));
    }, 4000);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      ws.close();
      resolve(undefined);
    });
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('websocket error'));
    });
  });
  pass('subscribeRepos upgrades to WebSocket');
} catch (error) {
  gaps.push(
    `subscribeRepos did not upgrade to WebSocket (${
      error instanceof Error ? error.message : error
    })`,
  );
}

console.log('');
console.log('── Later checks (compose + allowlisted ingest) ──────────');
for (const check of laterChecks) {
  info(check);
}
if (PEER_ORIGIN || PEER_HOST) {
  info(
    `Peer configured (${PEER_HOST ?? PEER_ORIGIN}) — inbound allowlist checks stay skipped until firehose ingest can consume a real CAR.`,
  );
}

console.log('');
if (gaps.length > 0) {
  console.log('Protocol gaps still open:');
  for (const gap of gaps) console.log(`  - ${gap}`);
  console.log('');
  console.log(
    'Do not add a reference PDS compose until getRepo is a verifiable CAR',
  );
  console.log('and subscribeRepos is the CBOR WebSocket firehose.');
  console.log('See planning/at-protocol/bluesky-compat.md.');
  if (STRICT) {
    fail('ATPROTO_TIER1=1: treating remaining gaps as failure');
    process.exit(1);
  }
  console.log(`${YELLOW}SKIP${NC}: Tier 1 lab is waiting on CAR + firehose`);
  process.exit(0);
}

pass('CAR and firehose surfaces look ready');
fail(
  'Reference PDS/client compose and allowlisted ingest assertions are not wired yet. Add them in this script — do not start a second harness.',
);
process.exit(1);
