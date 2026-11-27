import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { Server } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  type JWK,
  type JWTHeaderParameters,
} from 'jose';
import type { Request, Response } from 'express';

vi.mock('@openpeepshq/core/atproto', () => ({
  ATPROTO_ACCESS_SCOPE: 'com.atproto.access',
  verifyAtprotoAccess: vi.fn(),
  verifyAtprotoRefresh: vi.fn(),
  createAtprotoTokens: vi.fn(),
  loadLocalAtprotoIdentity: vi.fn(),
  randomOauthCode: vi.fn(),
  dpopThumbprint: async (jwk: JWK) =>
    (await import('jose')).calculateJwkThumbprint(jwk),
}));

vi.mock('@openpeepshq/core/accounts', () => ({
  checkPassword: vi.fn(),
  findByProfile: vi.fn(),
}));

vi.mock('@openpeepshq/core/profiles', () => ({
  findProfile: vi.fn(),
}));

vi.mock('@openpeepshq/core/redis', () => ({
  getSharedConnection: vi.fn(),
}));

vi.mock('@openpeepshq/core/log', () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { getSharedConnection } from '@openpeepshq/core/redis';
import {
  createAtprotoTokens,
  verifyAtprotoAccess,
  type AtprotoSessionClaims,
} from '@openpeepshq/core/atproto';
import { mountOauth } from './oauth';
import { requireAtprotoSession, verifyDpop } from './auth';

const nowSec = () => Math.floor(Date.now() / 1000);

const BASE_URL = 'http://localhost';

const makeProof = async (opts: {
  secretKey: CryptoKey;
  jwk: JWK;
  htm?: string;
  htu?: string;
  iat?: number;
  jti?: string;
  typ?: string;
  ath?: string;
}) => {
  const header: JWTHeaderParameters = {
    alg: 'ES256',
    typ: 'dpop+jwt',
    htm: 'GET',
    htu: `${BASE_URL}/xrpc/test`,
    jwk: opts.jwk,
  };
  if (opts.htm) header.htm = opts.htm;
  if (opts.htu) header.htu = opts.htu;
  if (opts.typ !== undefined) header.typ = opts.typ;
  const payload: Record<string, unknown> = { iat: opts.iat ?? nowSec() };
  if (opts.jti !== undefined) payload.jti = opts.jti;
  if (opts.ath !== undefined) payload.ath = opts.ath;
  const builder = new SignJWT(payload).setProtectedHeader(header);
  return builder.sign(opts.secretKey);
};

const reqWith = (
  dpop: string | undefined,
  method = 'GET',
  url = '/xrpc/test',
  authorization?: string,
) =>
  ({
    method,
    originalUrl: url,
    protocol: 'http',
    get: (name: string) => (name === 'host' ? 'localhost' : null),
    headers: {
      ...(dpop ? { dpop } : {}),
      ...(authorization ? { authorization } : {}),
    },
  }) as unknown as Request;

/**
 * Promisified `server.close` that also terminates keep-alive sockets, so the
 * close resolves once every connection is actually gone (a bare `server.close`
 * leaves half-open sockets draining and can leak them past the test).
 */
const closeServer = (server: Server) => {
  server.closeAllConnections?.();
  return promisify(server.close.bind(server))();
};

/**
 * Serves `app` on an ephemeral port, runs one request, and always drains the
 * server in `finally` (mirrors the `fetchOn` pattern in `xrpc.test.ts`). Keeps
 * the socket lifetime deterministic even when the route handler throws.
 * `headers` may be a function of the chosen port so a proof `htu` (which must
 * carry the origin incl. port) can be built once the port is known.
 */
const fetchOn = async (
  app: express.Express,
  options: {
    path: string;
    headers?:
      | Record<string, string>
      | ((
          port: number,
        ) => Record<string, string> | Promise<Record<string, string>>);
  },
) => {
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('no port');
  }
  const port = address.port;
  try {
    const headers =
      typeof options.headers === 'function'
        ? await options.headers(port)
        : options.headers;
    return await fetch(`http://127.0.0.1:${port}${options.path}`, { headers });
  } finally {
    await closeServer(server);
  }
};

/** Signs a proof with an explicit header/payload (for "missing field" cases). */
const signRaw = async (opts: {
  secretKey: CryptoKey;
  header: JWTHeaderParameters;
  payload: Record<string, unknown>;
}) =>
  new SignJWT(opts.payload)
    .setProtectedHeader(opts.header)
    .sign(opts.secretKey);

/**
 * base64url SHA-256 of a token — the `ath` claim of a DPoP proof. The claim is
 * defined in RFC 9449 §4.2, is REQUIRED for protected-resource access by
 * §7, and is validated (bound to the presented token) by §4.3 check 12.
 */
const athOf = (token: string) =>
  createHash('sha256').update(token).digest('base64url');

/**
 * Shared redis mock: each `beforeEach` gets a fresh in-memory replay store
 * (the default `set` emulates `SET key val NX EX` — first set wins) plus a
 * `vi.mocked(getSharedConnection)` stub pointing at it. Tests that need a
 * different store behavior (e.g. a connection outage) re-stub
 * `getSharedConnection` inside the test body.
 */
const mockRedis = () => {
  const seenJtiKeys = new Set<string>();
  const redis = {
    set: vi.fn(async (key: string) =>
      seenJtiKeys.has(key) ? null : (seenJtiKeys.add(key), 'OK'),
    ),
  };
  vi.mocked(getSharedConnection).mockResolvedValue(redis as never);
  return { redis, seenJtiKeys };
};

describe('atproto verifyDpop', () => {
  let secretKey: CryptoKey;
  let jwk: JWK;
  let redis: { set: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const pair = await generateKeyPair('ES256');
    secretKey = pair.privateKey as CryptoKey;
    jwk = (await exportJWK(pair.publicKey)) as JWK;
    ({ redis } = mockRedis());
  });

  const validProof = async (jti = `jti-${Math.random()}`) =>
    makeProof({ secretKey, jwk, jti });

  it('accepts a well-formed proof and returns the jkt', async () => {
    const jkt = await verifyDpop(reqWith(await validProof()));
    expect(typeof jkt).toBe('string');
    expect(jkt?.length).toBeGreaterThan(10);
  });

  it('rejects a replayed proof (same jti twice)', async () => {
    const proof = await validProof('replay-jti');
    expect(await verifyDpop(reqWith(proof))).toBeTypeOf('string');
    expect(await verifyDpop(reqWith(proof))).toBeUndefined();
  });

  it('rejects a missing DPoP header', async () => {
    expect(await verifyDpop(reqWith(undefined))).toBeUndefined();
  });

  it('rejects a malformed proof', async () => {
    expect(await verifyDpop(reqWith('not-a-jwt'))).toBeUndefined();
    expect(await verifyDpop(reqWith('a.b.c.d'))).toBeUndefined();
  });

  it('rejects a proof declaring an algorithm other than ES256', async () => {
    // Declare EdDSA in the header; the alg pin rejects before signature check.
    const base = await validProof('ed-jti');
    const [h, p, sig] = base.split('.');
    const header = JSON.parse(Buffer.from(h, 'base64url').toString());
    header.alg = 'EdDSA';
    const forged = [
      Buffer.from(JSON.stringify(header)).toString('base64url'),
      p,
      sig,
    ].join('.');
    expect(await verifyDpop(reqWith(forged))).toBeUndefined();
  });

  it('rejects a stale proof (iat older than 60s)', async () => {
    const proof = await makeProof({
      secretKey,
      jwk,
      iat: nowSec() - 61,
      jti: 'stale-jti',
    });
    expect(await verifyDpop(reqWith(proof))).toBeUndefined();
  });

  it('rejects a proof issued too far in the future', async () => {
    const proof = await makeProof({
      secretKey,
      jwk,
      iat: nowSec() + 6,
      jti: 'future-jti',
    });
    expect(await verifyDpop(reqWith(proof))).toBeUndefined();
  });

  it('rejects a proof missing iat', async () => {
    const raw = await signRaw({
      header: {
        alg: 'ES256',
        typ: 'dpop+jwt',
        htm: 'GET',
        htu: `${BASE_URL}/xrpc/test`,
        jwk,
      },
      payload: { jti: 'no-iat' },
      secretKey,
    });
    expect(await verifyDpop(reqWith(raw))).toBeUndefined();
  });

  it('rejects a proof missing jti', async () => {
    const raw = await signRaw({
      header: {
        alg: 'ES256',
        typ: 'dpop+jwt',
        htm: 'GET',
        htu: `${BASE_URL}/xrpc/test`,
        jwk,
      },
      payload: { iat: nowSec() },
      secretKey,
    });
    expect(await verifyDpop(reqWith(raw))).toBeUndefined();
  });

  it('rejects an htm that does not match the request method', async () => {
    const proof = await makeProof({ secretKey, jwk, jti: 'htm-jti' });
    expect(await verifyDpop(reqWith(proof, 'POST'))).toBeUndefined();
  });

  it('rejects an htu that does not match the request URL', async () => {
    const proof = await makeProof({ secretKey, jwk, jti: 'htu-jti' });
    expect(
      await verifyDpop(reqWith(proof, 'GET', '/xrpc/other')),
    ).toBeUndefined();
  });

  it('rejects a proof whose jkt does not match the expected key', async () => {
    const proof = await validProof('bound-jti');
    expect(await verifyDpop(reqWith(proof), 'not-the-thumbprint')).toBe(
      undefined,
    );
  });

  it('accepts a proof whose jkt matches the expected key', async () => {
    const { calculateJwkThumbprint } = await import('jose');
    const expected = await calculateJwkThumbprint(jwk);
    const proof = await validProof('bound-ok');
    expect(await verifyDpop(reqWith(proof), expected)).toBeTypeOf('string');
  });

  it('rejects a proof with a non dpop+jwt typ', async () => {
    const proof = await makeProof({
      secretKey,
      jwk,
      typ: 'jwt',
      jti: 'typ-jti',
    });
    expect(await verifyDpop(reqWith(proof))).toBeUndefined();
  });

  it('accepts a proof whose htu matches the request URI without a query string', async () => {
    // RFC 9449 §4.3: the proof htu is origin + path; the request may carry a
    // query string that is ignored for the comparison.
    const proof = await makeProof({
      secretKey,
      jwk,
      htu: `${BASE_URL}/xrpc/com.atproto.repo.describeRepo`,
      jti: 'htu-query',
    });
    expect(
      await verifyDpop(
        reqWith(proof, 'GET', '/xrpc/com.atproto.repo.describeRepo?foo=bar'),
      ),
    ).toBeTypeOf('string');
  });

  it('still rejects an htu that mismatches the path even when a query is present', async () => {
    const proof = await makeProof({
      secretKey,
      jwk,
      htu: `${BASE_URL}/xrpc/com.atproto.repo.describeRepo`,
      jti: 'htu-query-mismatch',
    });
    expect(
      await verifyDpop(
        reqWith(proof, 'GET', '/xrpc/com.atproto.repo.listRepos?foo=bar'),
      ),
    ).toBeUndefined();
  });

  it('accepts a proof carrying an ath that matches the presented access token', async () => {
    const token = 'at-access-token';
    const proof = await makeProof({
      secretKey,
      jwk,
      jti: 'ath-ok',
      ath: athOf(token),
    });
    expect(
      await verifyDpop(reqWith(proof, 'GET', '/xrpc/test', `DPoP ${token}`)),
    ).toBeTypeOf('string');
  });

  it('rejects a proof whose ath does not match the presented access token', async () => {
    const proof = await makeProof({
      secretKey,
      jwk,
      jti: 'ath-bad',
      ath: athOf('a-different-token'),
    });
    expect(
      await verifyDpop(reqWith(proof, 'GET', '/xrpc/test', 'DPoP some-token')),
    ).toBeUndefined();
  });

  it('rejects a proof carrying an ath but no Authorization header', async () => {
    const proof = await makeProof({
      secretKey,
      jwk,
      jti: 'ath-nobearer',
      ath: athOf('whatever'),
    });
    expect(await verifyDpop(reqWith(proof))).toBeUndefined();
  });

  it('rejects a proof whose ath binds a different access token than the one presented (two-token confusion)', async () => {
    // RFC 9449 §7 requires the `ath` on a protected-resource proof and §4.3
    // (check 12) binds it: a proof's `ath` must equal the hash of the access
    // token the SAME request presents — not merely "some" validly-hashed
    // token. The proof here is otherwise fully valid (fresh, unique jti,
    // matching htm/htu, signed by the expected key) and carries the `ath` of
    // token A, while the request presents token B. A verifyDpop that only
    // checked `ath` shape, or accepted any Authorization header, would let
    // this through; the digest must be computed from the presented token.
    const presented = 'presented-token-b';
    const proof = await makeProof({
      secretKey,
      jwk,
      jti: 'ath-two-token',
      ath: athOf('captured-token-a'),
    });
    expect(
      await verifyDpop(
        reqWith(proof, 'GET', '/xrpc/test', `DPoP ${presented}`),
      ),
    ).toBeUndefined();
    // Digest-shape pin: a proof whose `ath` is exactly the base64url SHA-256
    // of the PRESENTED token is accepted — computed fresh from the presented
    // token rather than a precomputed string.
    const matching = await makeProof({
      secretKey,
      jwk,
      jti: 'ath-two-token-ok',
      ath: athOf(presented),
    });
    expect(
      await verifyDpop(
        reqWith(matching, 'GET', '/xrpc/test', `DPoP ${presented}`),
      ),
    ).toBeTypeOf('string');
  });

  it('accepts an ath-less proof when a DPoP-bound access token is presented (deliberate pin)', async () => {
    // RFC 9449 §7 requires a protected-resource proof to carry `ath`; the
    // server-side check (auth.ts) binds `ath` only when the proof carries it,
    // so a proof with NO `ath` is accepted today even when the request
    // presents a bound access token. This is a deliberate pin, not an
    // accident: a captured `ath`-less proof stays replayable across an
    // access-token rotation within the 60s window, and enforcing §7
    // strictly (401 on an `ath`-less protected-resource proof) would break
    // clients that pre-date the binding. Load-bearing either way — if a
    // future change makes the server reject `ath`-less proofs, this test
    // must be updated to assert the rejection.
    const presented = 'bound-token-no-ath';
    const proofNoToken = await makeProof({ secretKey, jwk, jti: 'ath-absent' });
    expect(await verifyDpop(reqWith(proofNoToken))).toBeTypeOf('string');
    // A fresh proof (distinct `jti` — a replayed proof is rejected by the
    // replay guard, not the `ath` check) with the bound token presented.
    const proof = await makeProof({
      secretKey,
      jwk,
      jti: 'ath-absent-presented',
    });
    expect(
      await verifyDpop(
        reqWith(proof, 'GET', '/xrpc/test', `DPoP ${presented}`),
      ),
    ).toBeTypeOf('string');
  });

  it('fails closed when the Redis replay store is unavailable', async () => {
    // If the replay-store connection rejects (server down), the rejection
    // must propagate out of verifyDpop so no request can be authenticated
    // while the replay store is unavailable — never silently accepted.
    const outageError = new Error('redis down');
    vi.mocked(getSharedConnection).mockRejectedValue(outageError);
    const proof = await validProof('redis-outage-jti');
    await expect(verifyDpop(reqWith(proof))).rejects.toThrow(outageError);
  });

  it('stores each consumed jti with a bounded TTL (NX + EX)', async () => {
    // The jti keyset must stay bounded so a faulty client cannot grow it:
    // pin the exact options, a future refactor to `setEx` (or a dropped
    // `EX`) would go unnoticed without this.
    const proof = await validProof('ttl-jti');
    expect(await verifyDpop(reqWith(proof))).toBeTypeOf('string');
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('atproto:dpop:jti:ttl-jti'),
      '1',
      expect.objectContaining({ NX: true, EX: 60 }),
    );
  });
});

describe('atproto requireAtprotoSession', () => {
  let secretKey: CryptoKey;
  let jwk: JWK;
  let jkt: string;
  let seenJtiKeys: Set<string>;

  const claims = (
    extra?: Partial<AtprotoSessionClaims>,
  ): AtprotoSessionClaims =>
    ({
      did: 'did:web:community.example:atproto:users:alice',
      profileId: 'p1',
      scope: 'com.atproto.access',
      ...extra,
    }) as AtprotoSessionClaims;

  const resWith = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response & {
      status: ReturnType<typeof vi.fn>;
      json: ReturnType<typeof vi.fn>;
    };
    return res;
  };

  const bindJkt = async () => {
    const { calculateJwkThumbprint } = await import('jose');
    return calculateJwkThumbprint(jwk);
  };

  const proofFor = async (jti: string) => makeProof({ secretKey, jwk, jti });

  beforeEach(async () => {
    const pair = await generateKeyPair('ES256');
    secretKey = pair.privateKey as CryptoKey;
    jwk = (await exportJWK(pair.publicKey)) as JWK;
    jkt = await bindJkt();
    ({ seenJtiKeys } = mockRedis());
    vi.mocked(verifyAtprotoAccess).mockReset();
  });

  it('returns 400 when a DPoP-scheme bound token arrives without a DPoP header', async () => {
    vi.mocked(verifyAtprotoAccess).mockResolvedValue(claims({ jkt }));
    const res = resWith();
    const result = await requireAtprotoSession(
      reqWith(undefined, 'GET', '/xrpc/test', 'DPoP bound-token'),
      res,
    );
    expect(result).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'InvalidRequest' }),
    );
  });

  it('returns 401 when a bound token arrives with the plain Bearer scheme', async () => {
    vi.mocked(verifyAtprotoAccess).mockResolvedValue(claims({ jkt }));
    const res = resWith();
    const result = await requireAtprotoSession(
      reqWith(undefined, 'GET', '/xrpc/test', 'Bearer bound-token'),
      res,
    );
    expect(result).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepts a DPoP-scheme bound token with a valid matching proof', async () => {
    vi.mocked(verifyAtprotoAccess).mockResolvedValue(claims({ jkt }));
    const proof = await proofFor('session-ok');
    const res = resWith();
    const result = await requireAtprotoSession(
      reqWith(proof, 'GET', '/xrpc/test', 'DPoP bound-token'),
      res,
    );
    expect(result).toEqual(claims({ jkt }));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts an unbound token with the Bearer scheme (no proof needed)', async () => {
    vi.mocked(verifyAtprotoAccess).mockResolvedValue(claims());
    const res = resWith();
    const result = await requireAtprotoSession(
      reqWith(undefined, 'GET', '/xrpc/test', 'Bearer plain-token'),
      res,
    );
    expect(result).toEqual(claims());
  });

  it('accepts a lowercase `bearer` scheme for a bound token with a valid proof (case-insensitive scheme)', async () => {
    // RFC 6750 §2.1: the authentication scheme is case-insensitive; `bearer`
    // must be treated as `Bearer`, and a bound token presented with it (no
    // DPoP proof) must be rejected exactly as the canonical casing is.
    vi.mocked(verifyAtprotoAccess).mockResolvedValue(claims({ jkt }));
    const res = resWith();
    const result = await requireAtprotoSession(
      reqWith(undefined, 'GET', '/xrpc/test', 'bearer bound-token'),
      res,
    );
    expect(result).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(401);
    // And with a valid proof attached, `dpop` (lowercase) is treated as the
    // DPoP scheme and accepted.
    const proof = await proofFor('scheme-case-ok');
    const resOk = resWith();
    const resultOk = await requireAtprotoSession(
      reqWith(proof, 'GET', '/xrpc/test', 'dpop bound-token'),
      resOk,
    );
    expect(resultOk).toEqual(claims({ jkt }));
    expect(resOk.status).not.toHaveBeenCalled();
  });

  it('accepts an unbound token with the DPoP scheme and a valid proof (deliberate pin)', async () => {
    // The fourth scheme×binding combination: an UNBOUND token (no `cnf.jkt`)
    // presented with the `DPoP` scheme and a valid proof. The `claims.jkt`
    // guard in `requireAtprotoSession` skips proof verification entirely for
    // unbound tokens, so the attached proof is accepted but never even parsed.
    // The acceptance is deliberate, not an oversight: RFC 9449 §7 defines
    // the DPoP scheme for DPoP-BOUND tokens, and `bearerToken` accepts the
    // `DPoP` scheme unconditionally so clients that always set it are not
    // locked out when presenting an unbound token. Pinning this keeps a future
    // refactor that instead routed every `DPoP`-scheme request through
    // `verifyDpop` (which would 401 the no-proof variant) load-bearing: this
    // test would then fail, forcing the decision to be made on the record.
    vi.mocked(verifyAtprotoAccess).mockResolvedValue(claims());
    const proof = await proofFor('session-unbound-dpop');
    const res = resWith();
    const result = await requireAtprotoSession(
      reqWith(proof, 'GET', '/xrpc/test', 'DPoP unbound-token'),
      res,
    );
    expect(result).toEqual(claims());
    expect(res.status).not.toHaveBeenCalled();
    // The header is ignored for unbound tokens, not merely parsed-and-accepted:
    // a malformed DPoP value still succeeds because nothing reads it.
    const resMalformed = resWith();
    const resultMalformed = await requireAtprotoSession(
      reqWith('not.a.jwt', 'GET', '/xrpc/test', 'DPoP unbound-token'),
      resMalformed,
    );
    expect(resultMalformed).toEqual(claims());
    expect(resMalformed.status).not.toHaveBeenCalled();
    // And a well-formed proof signed with the WRONG key (signature does not
    // verify against its declared `jwk`) is equally ignored: it must not 401
    // the request nor touch the replay store. This pins that the unbound path
    // never calls `verifyDpop` at all — the proof is not just valid-tolerated,
    // it is never even validated.
    const wrongPair = await generateKeyPair('ES256');
    const wrongJwk = (await exportJWK(wrongPair.publicKey)) as JWK;
    const wrongKeyProof = await makeProof({
      secretKey,
      jwk: wrongJwk,
      jti: 'session-unbound-dpop-wrongkey',
    });
    const resWrong = resWith();
    const resultWrong = await requireAtprotoSession(
      reqWith(wrongKeyProof, 'GET', '/xrpc/test', 'DPoP unbound-token'),
      resWrong,
    );
    expect(resultWrong).toEqual(claims());
    expect(resWrong.status).not.toHaveBeenCalled();
    expect(seenJtiKeys).toEqual(new Set());
  });

  it('accepts an unbound token with a lowercase `dpop` scheme and a valid proof (case-insensitive scheme)', async () => {
    // RFC 6750 §2.1: the scheme is case-insensitive for every token kind, so
    // the unbound path — which skips proof verification entirely (no
    // `cnf.jkt`) — must accept `dpop` (lowercase) exactly as it accepts the
    // canonical `DPoP` casing the test above pins. Without this, the
    // round-7 scheme canonicalization could regress on the unbound path
    // (e.g. `bearerToken` canonicalizing bound tokens only) without tripping
    // the bound-token case test at the `bearer` line above.
    vi.mocked(verifyAtprotoAccess).mockResolvedValue(claims());
    const proof = await proofFor('session-unbound-dpop-lowercase');
    const res = resWith();
    const result = await requireAtprotoSession(
      reqWith(proof, 'GET', '/xrpc/test', 'dpop unbound-token'),
      res,
    );
    expect(result).toEqual(claims());
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('atproto DPoP over a real request', () => {
  let secretKey: CryptoKey;
  let jwk: JWK;

  beforeEach(async () => {
    const pair = await generateKeyPair('ES256');
    secretKey = pair.privateKey as CryptoKey;
    jwk = (await exportJWK(pair.publicKey)) as JWK;
    const { calculateJwkThumbprint } = await import('jose');
    const jkt = await calculateJwkThumbprint(jwk);
    mockRedis();
    vi.mocked(verifyAtprotoAccess).mockResolvedValue({
      did: 'did:web:community.example:atproto:users:alice',
      profileId: 'p1',
      scope: 'com.atproto.access',
      jkt,
    } as AtprotoSessionClaims);
  });

  it('verifies an RFC 9449 proof against a real request carrying a query string', async () => {
    // A live socket exercises req.protocol / req.get('host') / originalUrl
    // end to end: the client's htu omits the query string, the request
    // carries one, and RFC 9449 §4.3 compares both sides as origin + path.
    const app = express();
    app.get('/xrpc/com.atproto.repo.describeRepo', async (req, res) => {
      // Always end with a sent response (requireAtprotoSession already
      // responds on its auth-failure branches, so only send 200 when it
      // succeeded) — otherwise fetchOn's finally-drain would hang on an
      // unanswered request.
      try {
        const claims = await requireAtprotoSession(req, res);
        if (claims && !res.headersSent) res.status(200).json({ ok: true });
      } catch {
        if (!res.headersSent) res.status(500).json({ error: 'handler' });
      }
    });
    // The Host header carries the ephemeral port, so the proof htu must be
    // origin (with port) + path, per RFC 9449 §4.3; build it once fetchOn has
    // chosen the port.
    const response = await fetchOn(app, {
      path: '/xrpc/com.atproto.repo.describeRepo?limit=5',
      headers: async (port) => {
        const proof = await makeProof({
          secretKey,
          jwk,
          htu: `http://127.0.0.1:${port}/xrpc/com.atproto.repo.describeRepo`,
          jti: 'integration-jti',
        });
        return {
          authorization: 'DPoP bound-token',
          dpop: proof,
        };
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe('atproto OAuth auth-code grant', () => {
  it('binds the issued tokens to the presenting DPoP key (cnf.jkt, e2e)', async () => {
    // The full auth-code binding path (stored code → verifyChallenge →
    // createAtprotoTokens with the proof key's jkt) is exercised over a live
    // socket so the DPoP proof is validated exactly as in production. The
    // code is seeded directly through the oauth store (authorize is a
    // login-gated HTML form); the PKCE verifier matches the stored
    // challenge, and the DPoP header carries a proof from the key whose
    // jkt the issued access/refresh tokens must embed under `cnf`.
    const pair = await generateKeyPair('ES256');
    const secretKey = pair.privateKey as CryptoKey;
    const jwk = (await exportJWK(pair.publicKey)) as JWK;
    // Compute the expected thumbprint directly (not via the mocked helper),
    // so the assertion is independent of what verifyDpop computes.
    const { calculateJwkThumbprint } = await import('jose');
    const jkt = await calculateJwkThumbprint(jwk);
    // Map-backed redis so takeCode's GET sees exactly what the store wrote.
    const store = new Map<string, string>();
    const redis = {
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK';
      }),
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      del: vi.fn(async (key: string) => {
        store.delete(key);
      }),
    };
    vi.mocked(getSharedConnection).mockResolvedValue(redis as never);
    vi.mocked(createAtprotoTokens).mockResolvedValue({
      accessJwt: 'access-jwt',
      refreshJwt: 'refresh-jwt',
    });

    const app = express();
    app.use(express.json());
    mountOauth(app);
    // Seed the code exactly as mountOauth's authorize handler stores it.
    await redis.set(
      'atproto:oauth:code:oauth-code-1',
      JSON.stringify({
        profileId: 'p1',
        did: 'did:web:community.example:atproto:users:alice',
        redirectUri: 'http://client.example/cb',
        codeChallenge: createHash('sha256')
          .update('verifier-1')
          .digest('base64url'),
      }),
    );

    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('no port');
    }
    const port = address.port;
    try {
      const proof = await makeProof({
        secretKey,
        jwk,
        htm: 'POST',
        htu: `http://127.0.0.1:${port}/oauth/token`,
        jti: 'oauth-code-jti',
      });
      const response = await fetch(`http://127.0.0.1:${port}/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          dpop: proof,
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: 'oauth-code-1',
          redirect_uri: 'http://client.example/cb',
          code_verifier: 'verifier-1',
        }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        access_token: 'access-jwt',
        refresh_token: 'refresh-jwt',
        token_type: 'DPoP',
      });
      // The jkt in the claims passed to createAtprotoTokens must be the
      // thumbprint of the PRESENTING proof key — the emitted tokens are the
      // ones bound to it.
      expect(createAtprotoTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          did: 'did:web:community.example:atproto:users:alice',
          profileId: 'p1',
          jkt,
        }),
      );
    } finally {
      await closeServer(server);
    }
  });
});
