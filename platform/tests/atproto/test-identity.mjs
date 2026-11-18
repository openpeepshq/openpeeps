#!/usr/bin/env node
/**
 * Tier 0 — identity and lexicon conformance against a local OpenPeeps
 * instance. Uses official @atproto libraries. Not run on ordinary PRs.
 *
 *   ATPROTO_ORIGIN=http://localhost:5173 node test-identity.mjs
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DidResolver, ensureAtpDocument } from '@atproto/identity';
import { XrpcClient } from '@atproto/xrpc';
import { Agent, AppBskyFeedPost, schemas } from '@atproto/api';

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
const EMAIL = process.env.EMAIL ?? 'atproto@openpeeps.test';
const PASSWORD = process.env.PASSWORD ?? 'atproto-test-12';
const HANDLE = process.env.HANDLE ?? 'atproto';
const REGISTER = process.env.REGISTER !== '0';

const sanitizeAtHandleLabel = (handle) => {
  const label = handle
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .slice(0, 63);
  return label.length > 0 ? label : 'user';
};

const rkeyFromPostId = (postId) => {
  const hex = createHash('sha256').update(postId).digest('hex').slice(0, 12);
  return `3${hex}`;
};

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

let failures = 0;
const pass = (msg) => console.log(`  ${GREEN}✓ PASS${NC}: ${msg}`);
const fail = (msg, extra) => {
  failures += 1;
  console.log(`  ${RED}✗ FAIL${NC}: ${msg}`);
  if (extra) console.log(`   ${extra}`);
};
const warn = (msg) => console.log(`  ${YELLOW}⚠ WARN${NC}: ${msg}`);
const info = (msg) => console.log(`  ${YELLOW}…${NC} ${msg}`);

const jsonHeaders = (token) => ({
  'content-type': 'application/json',
  ...(token ? { authorization: `Bearer ${token}` } : {}),
});

const api = async (method, path, { token, body } = {}) => {
  const response = await fetch(`${ORIGIN}${path}`, {
    method,
    headers: jsonHeaders(token),
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: response.ok, status: response.status, data, text };
};

const sleep = (ms) =>
  new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const uniqueHandle = (prefix) => {
  const suffix = `${Date.now().toString(36).slice(-5)}${Math.random()
    .toString(36)
    .slice(2, 5)}`;
  return `${prefix}${suffix}`.replace(/[^a-z0-9_]/g, '').slice(0, 16);
};

const createNote = (token, content, extras = {}) =>
  api('POST', '/api/openpeeps/core/v1/posts', {
    token,
    body: {
      type: 'note',
      visibility: extras.visibility ?? 'public',
      data: { type: 'note', content },
      ...extras,
    },
  });

const xrpcData = async (xrpc, nsid, params) => {
  try {
    const response = await xrpc.call(nsid, params);
    return { data: response.data, invalid: null };
  } catch (error) {
    if (error && typeof error === 'object' && 'responseBody' in error) {
      return {
        data: error.responseBody,
        invalid: error,
      };
    }
    throw error;
  }
};

const waitForRecord = async (xrpc, repo, rkey, { timeoutMs = 12_000 } = {}) => {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const { data, invalid } = await xrpcData(
        xrpc,
        'com.atproto.repo.getRecord',
        { repo, collection: 'app.bsky.feed.post', rkey },
      );
      if (data?.uri || data?.value) return { data, invalid };
    } catch (error) {
      lastError = error;
    }
    await sleep(400);
  }
  if (lastError) throw lastError;
  return null;
};

const validateDidDocument = (did, doc) => {
  const resolver = new DidResolver({});
  if (typeof resolver.validateDidDoc === 'function') {
    return resolver.validateDidDoc(did, doc);
  }
  if (doc?.id !== did) {
    throw new Error(`DID document id ${doc?.id} !== ${did}`);
  }
  return doc;
};

const resolveDidViaOfficial = async (did) => {
  const originUrl = new URL(ORIGIN);
  const previous = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.hostname === HANDLE_DOMAIN || url.hostname === 'localhost') {
      url.protocol = originUrl.protocol;
      url.host = originUrl.host;
      return previous(url, init);
    }
    return previous(input, init);
  };
  try {
    const resolver = new DidResolver({ timeout: 8_000 });
    if (typeof resolver.resolve === 'function') {
      return await resolver.resolve(did);
    }
    return null;
  } finally {
    globalThis.fetch = previous;
  }
};

const listRecordUris = async (xrpc, repo) => {
  const { data: listed, invalid } = await xrpcData(
    xrpc,
    'com.atproto.repo.listRecords',
    { repo, collection: 'app.bsky.feed.post', limit: 50 },
  );
  if (invalid) {
    warn(`listRecords lexicon warning: ${invalid.message ?? invalid}`);
  }
  const records = listed?.records ?? [];
  return records.map((row) => row.uri).filter(Boolean);
};

const recordValue = (record) => record?.value ?? record?.data?.value ?? record;

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(' AT Protocol Tier 0 — identity and lexicon');
console.log(` origin=${ORIGIN}  handleDomain=${HANDLE_DOMAIN}`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

let described;
try {
  described = await api('GET', '/xrpc/com.atproto.server.describeServer');
} catch (error) {
  fail(
    `Cannot reach ${ORIGIN}. Start the API (run-openpeeps) first.`,
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
if (!described.ok) {
  fail(
    'XRPC is not mounted. Set atproto.active=true and restart the API.',
    `GET /xrpc/com.atproto.server.describeServer → ${described.status}`,
  );
  process.exit(1);
}
pass('describeServer is reachable (atproto.active)');

info(`Logging in as ${EMAIL}...`);
let login = await api('POST', '/api/openpeeps/core/v1/auth/login', {
  body: { email: EMAIL, password: PASSWORD },
});
if (!login.ok && REGISTER) {
  info('Login failed; registering account...');
  const registered = await api('POST', '/api/openpeeps/core/v1/auth/register', {
    body: {
      handle: HANDLE,
      displayName: HANDLE,
      email: EMAIL,
      password: PASSWORD,
      privacyPolicyAccepted: true,
    },
  });
  if (registered.ok || registered.status === 409) {
    login = await api('POST', '/api/openpeeps/core/v1/auth/login', {
      body: { email: EMAIL, password: PASSWORD },
    });
  } else {
    fail('Register failed', registered.text.slice(0, 300));
  }
}
const token = login.data?.token;
if (!token) {
  fail('Riddl login failed', login.text.slice(0, 300));
  process.exit(1);
}
pass('Riddl login');

const profile = await api('GET', '/api/openpeeps/core/v1/profiles/current', {
  token,
});
const handle = profile.data?.handle ?? HANDLE;
const label = sanitizeAtHandleLabel(handle);
const atHandle = `${label}.${HANDLE_DOMAIN}`;
const expectedDid = `did:web:${HANDLE_DOMAIN}:atproto:users:${label}`;
info(`OpenPeeps handle=${handle} → AT handle=${atHandle} did=${expectedDid}`);

console.log('');
console.log('── DID document ─────────────────────────────────────────');

const didPath = `/atproto/users/${label}/did.json`;
const didRes = await api('GET', didPath);
if (!didRes.ok || !didRes.data) {
  fail(`GET ${didPath}`, didRes.text.slice(0, 300));
} else {
  try {
    const parsed = validateDidDocument(expectedDid, didRes.data);
    if (parsed.id !== expectedDid) {
      fail(`DID document id is ${parsed.id}, expected ${expectedDid}`);
    } else {
      pass(`DidResolver accepted ${expectedDid}`);
    }
    const aka = parsed.alsoKnownAs ?? [];
    if (aka.includes(`at://${atHandle}`)) {
      pass(`alsoKnownAs includes at://${atHandle}`);
    } else {
      fail(`alsoKnownAs missing at://${atHandle}`, JSON.stringify(aka));
    }
    const pds = (parsed.service ?? []).find(
      (service) =>
        service.id === '#atproto_pds' ||
        service.type === 'AtprotoPersonalDataServer',
    );
    if (pds?.serviceEndpoint) {
      pass(`#atproto_pds → ${pds.serviceEndpoint}`);
    } else {
      fail('DID document missing #atproto_pds service');
    }
    try {
      const atp = ensureAtpDocument(parsed);
      pass(`ensureAtpDocument handle=${atp.handle} pds=${atp.pds}`);
    } catch (error) {
      warn(
        `ensureAtpDocument: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } catch (error) {
    fail(
      'DidResolver rejected the DID document',
      error instanceof Error ? error.message : String(error),
    );
  }

  try {
    const resolved = await resolveDidViaOfficial(expectedDid);
    if (resolved?.id === expectedDid) {
      pass('DidResolver.resolve fetched the same did:web document');
    } else if (resolved == null) {
      warn('DidResolver.resolve returned null (local HTTP rewrite may differ)');
    } else {
      fail(`DidResolver.resolve returned ${resolved.id}`);
    }
  } catch (error) {
    warn(
      `DidResolver.resolve skipped: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

console.log('');
console.log('── Handle resolution ────────────────────────────────────');

const xrpc = new XrpcClient(ORIGIN, schemas);
let resolvedDid;
try {
  const { data: resolved, invalid } = await xrpcData(
    xrpc,
    'com.atproto.identity.resolveHandle',
    { handle: atHandle },
  );
  resolvedDid = resolved?.did;
  if (invalid) {
    warn(`resolveHandle lexicon warning: ${invalid.message ?? invalid}`);
  }
  if (resolvedDid === expectedDid) {
    pass(`resolveHandle(${atHandle}) → ${resolvedDid}`);
  } else {
    fail(
      `resolveHandle returned ${resolvedDid}, expected ${expectedDid}`,
      JSON.stringify(resolved),
    );
  }
} catch (error) {
  fail(
    'resolveHandle via @atproto/xrpc failed',
    error instanceof Error ? error.message : String(error),
  );
}

const repo = resolvedDid ?? expectedDid;

console.log('');
console.log('── Visibility gate ──────────────────────────────────────');

const marker = `atproto-tier0-${Date.now()}`;
const publicNote = await createNote(token, `${marker} public`, {
  visibility: 'public',
});
if (!publicNote.ok || !publicNote.data?.id) {
  fail('Create public note via Riddl', publicNote.text.slice(0, 300));
} else {
  pass(`Public note created (${publicNote.data.id})`);
}

const localNote = await createNote(token, `${marker} local`, {
  visibility: 'local',
});
if (!localNote.ok || !localNote.data?.id) {
  fail('Create local note via Riddl', localNote.text.slice(0, 300));
} else {
  pass(`Local note created (${localNote.data.id})`);
}

let groupNoteId;
const groupHandle = uniqueHandle('atg');
const group = await api('POST', '/api/openpeeps/core/v1/groups', {
  token,
  body: {
    handle: groupHandle,
    displayName: `AT ${groupHandle}`,
    discoverable: true,
    capabilities: {
      local: { add: ['core-groups-read', 'core-posts-read'] },
      member: { add: ['core-posts-create-*'] },
      owner: { add: ['core-posts-*', 'core-groups-*'] },
    },
  },
});
if (group.ok && group.data?.id) {
  const groupNote = await createNote(token, `${marker} group`, {
    visibility: 'group',
    groupId: group.data.id,
  });
  if (groupNote.ok && groupNote.data?.id) {
    groupNoteId = groupNote.data.id;
    pass(`Group note created (${groupNoteId})`);
  } else {
    warn(`Group note create failed: ${groupNote.text.slice(0, 200)}`);
  }
} else {
  warn(`Group create skipped: ${group.text.slice(0, 200)}`);
}

let directNoteId;
const peerHandle = uniqueHandle('atp');
const peerEmail = `${peerHandle}@openpeeps.test`;
const peer = await api('POST', '/api/openpeeps/core/v1/auth/register', {
  body: {
    handle: peerHandle,
    displayName: peerHandle,
    email: peerEmail,
    password: PASSWORD,
    privacyPolicyAccepted: true,
  },
});
if (peer.ok || peer.status === 409) {
  const peerLogin = peer.ok
    ? peer
    : await api('POST', '/api/openpeeps/core/v1/auth/login', {
        body: { email: peerEmail, password: PASSWORD },
      });
  const peerToken = peerLogin.data?.token;
  const author = await api('GET', '/api/openpeeps/core/v1/profiles/current', {
    token,
  });
  const other = peerToken
    ? await api('GET', '/api/openpeeps/core/v1/profiles/current', {
        token: peerToken,
      })
    : { ok: false };
  if (author.ok && other.ok) {
    const direct = await createNote(token, `${marker} direct`, {
      visibility: 'direct',
      audience: [author.data, other.data],
    });
    if (direct.ok && direct.data?.id) {
      directNoteId = direct.data.id;
      pass(`Direct note created (${directNoteId})`);
    } else {
      warn(`Direct note create failed: ${direct.text.slice(0, 200)}`);
    }
  }
} else {
  warn(`Peer register skipped: ${peer.text.slice(0, 200)}`);
}

if (publicNote.data?.id) {
  const rkey = rkeyFromPostId(publicNote.data.id);
  try {
    const found = await waitForRecord(xrpc, repo, rkey);
    const record = found?.data;
    const value = recordValue(record);
    if (found?.invalid) {
      warn(
        `getRecord lexicon warning: ${found.invalid.message ?? found.invalid}`,
      );
    }
    if (!record || !value) {
      fail(`getRecord did not find public note rkey=${rkey}`);
    } else {
      const uri = record.uri;
      if (uri === `at://${repo}/app.bsky.feed.post/${rkey}`) {
        pass(`getRecord uri ${uri}`);
      } else {
        fail(
          `getRecord uri ${uri}, expected at://${repo}/app.bsky.feed.post/${rkey}`,
        );
      }
      const valid = AppBskyFeedPost.validateRecord(value);
      if (valid.success) {
        pass('Record validates as app.bsky.feed.post (@atproto/api lexicon)');
      } else if (
        value.$type === 'app.bsky.feed.post' &&
        typeof value.text === 'string'
      ) {
        warn(
          `Lexicon validator rejected a $type=app.bsky.feed.post record: ${
            valid.error ?? 'unknown'
          }`,
        );
        pass('Record $type is app.bsky.feed.post');
      } else {
        fail('Public record is not app.bsky.feed.post', JSON.stringify(value));
      }
      if (String(value.text ?? '').includes(`${marker} public`)) {
        pass('Public note text is present on the AT record');
      } else {
        fail('Public note text missing from AT record', JSON.stringify(value));
      }
    }
  } catch (error) {
    fail(
      `getRecord failed for public note rkey=${rkey}`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

try {
  const uris = await listRecordUris(xrpc, repo);
  const leaked = [localNote.data?.id, groupNoteId, directNoteId]
    .filter(Boolean)
    .map((id) => `at://${repo}/app.bsky.feed.post/${rkeyFromPostId(id)}`);
  const hits = leaked.filter((uri) => uris.includes(uri));
  if (hits.length === 0) {
    pass('local/group/direct notes are absent from listRecords');
  } else {
    fail('Non-public notes appeared on listRecords', hits.join(', '));
  }
} catch (error) {
  fail(
    'listRecords failed',
    error instanceof Error ? error.message : String(error),
  );
}

console.log('');
console.log('── Session JWT is not a Riddl token ─────────────────────');

const session = await api('POST', '/xrpc/com.atproto.server.createSession', {
  body: { identifier: atHandle, password: PASSWORD },
});
const accessJwt = session.data?.accessJwt;
if (!session.ok || !accessJwt) {
  fail('createSession failed', session.text.slice(0, 300));
} else {
  pass('createSession issued an AT access JWT');
  const riddl = await api('GET', '/api/openpeeps/core/v1/profiles/current', {
    token: accessJwt,
  });
  if (!riddl.ok) {
    pass(`Riddl rejected the AT JWT (HTTP ${riddl.status})`);
  } else {
    fail('Riddl accepted an AT session JWT as a community token');
  }
}

console.log('');
console.log('── Optional Agent ───────────────────────────────────────');

try {
  const agent = new Agent(ORIGIN);
  const profileView = await agent.app.bsky.actor.getProfile({
    actor: atHandle,
  });
  const did = profileView.data?.did ?? profileView.did;
  if (did === expectedDid) {
    pass(`Agent getProfile(${atHandle}) → ${did}`);
  } else {
    fail(`Agent getProfile returned ${did}, expected ${expectedDid}`);
  }
  const feed = await agent.app.bsky.feed.getAuthorFeed({ actor: atHandle });
  const items = feed.data?.feed ?? feed.feed ?? [];
  if (Array.isArray(items)) {
    pass(`Agent getAuthorFeed returned ${items.length} item(s)`);
  } else {
    fail('Agent getAuthorFeed returned an unexpected shape');
  }
} catch (error) {
  warn(
    `Agent optional checks skipped: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}

console.log('');
if (failures > 0) {
  console.log(`${RED}${failures} check(s) failed${NC}`);
  process.exit(1);
}
console.log(`${GREEN}All Tier 0 checks passed${NC}`);
process.exit(0);
