import { BlockList, isIP, type LookupFunction } from 'node:net';
import dns from 'node:dns';
import { Agent, type Dispatcher } from 'undici';

// SSRF guard for the URL-preview fetcher (#1973).
//
// Every resolved address is checked against this blocklist at the connection
// layer (undici `connect.lookup`), so redirects and DNS rebinding are covered
// per hop. `safeFetch` runs `assertPublicHost()` on every URL it is about to
// request — the first one and every redirect target — because IP-literal
// URLs skip the lookup entirely (Node's net.connect only resolves
// hostnames). IP-literal spellings are caught post-canonicalization (WHATWG
// `new URL` reduces `0x7f.1` and `0177.0.0.1` to `127.0.0.1`); DNS-resolved
// hostnames are caught by the validating lookup on every hop.

const blocklist = new BlockList();

const block = (cidr: string, type: 'ipv4' | 'ipv6') => {
  const [net, prefix] = cidr.split('/');
  blocklist.addSubnet(net, Number(prefix), type);
};

for (const cidr of [
  '0.0.0.0/8', // "this network" (RFC 791)
  '10.0.0.0/8', // private
  '100.64.0.0/10', // CGNAT
  '127.0.0.0/8', // loopback
  '169.254.0.0/16', // link-local (includes the 169.254.169.254 metadata service)
  '172.16.0.0/12', // private
  '192.0.0.0/24', // IETF protocol assignments
  '192.0.2.0/24', // TEST-NET-1
  '192.88.99.0/24', // 6to4 relay anycast (deprecated)
  '192.168.0.0/16', // private
  '198.18.0.0/15', // benchmarking
  '198.51.100.0/24', // TEST-NET-2
  '203.0.113.0/24', // TEST-NET-3
  '224.0.0.0/4', // multicast
  '240.0.0.0/4', // reserved
  '255.255.255.255/32', // limited broadcast
]) {
  block(cidr, 'ipv4');
}

for (const cidr of [
  '::/128', // unspecified
  '::1/128', // loopback
  'fc00::/7', // unique local
  'fe80::/10', // link-local
  'ff00::/8', // multicast
  '2001:db8::/32', // documentation
  // NAT64: a /96 embedding of any IPv4, so the whole prefix is blocked
  // rather than mirrored per-range like the `::ffff:` rules below. Deliberate
  // plan deviation, recorded here: `BlockList` cannot match a NAT64-embedded
  // IPv4 against the IPv4 subnets, so mirroring them under the /96 is not
  // possible without enumerating every embedded range. A public v4-only
  // origin reachable solely through public NAT64 therefore loses link
  // previews — accepted, because DNS64 would have made the same origin
  // natively resolvable anyway, so NAT64 is never a legitimate fetch target
  // for this feature.
  '64:ff9b::/96',
  '64:ff9b:1::/48', // local-use NAT64 (RFC 8215)
]) {
  block(cidr, 'ipv6');
}

// Node's BlockList quirks (Node 24, verified): `check(ip)` without a type
// argument only matches IPv4 targets — IPv6 targets return false even when an
// identical IPv6 entry exists — and with an explicit `ipv6` type, IPv4-mapped
// targets (`::ffff:127.0.0.1`, `::ffff:7f00:1`) silently match IPv4 entries,
// which is why a blanket `::ffff:0:0/96` entry would block all of IPv4. So
// every check passes an explicit lane type, and IPv4-mapped spellings are
// unwrapped to their embedded IPv4 first.
const MAPPED_V4_RE =
  /^::ffff:(\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f]{1,4}:[0-9a-f]{1,4})$/i;

export const unwrapMappedV4 = (ip: string) => {
  const match = MAPPED_V4_RE.exec(ip);
  if (!match) {
    return null;
  }
  const mapped = match[1];
  if (mapped.includes('.')) {
    return mapped;
  }
  const [hi, lo] = mapped.split(':').map((h) => parseInt(h, 16));
  return [(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255].join('.');
};

const isBlockedIp = (ip: string) => {
  if (isIP(ip) === 0) {
    return false;
  }
  const mappedV4 = unwrapMappedV4(ip);
  if (mappedV4) {
    return blocklist.check(mappedV4, 'ipv4');
  }
  return blocklist.check(ip, isIP(ip) === 4 ? 'ipv4' : 'ipv6');
};

// Exposes the real in-memory blocklist to unit tests without exporting
// production-only symbols or DNS/network-touching code paths.
export const testExports = { blocklist, isBlockedIp };

/**
 * Pre-flight literal check: reject URLs whose host is already an IP literal
 * (or a spelling that canonicalizes to one) that the blocklist covers.
 * Node's net.connect skips `lookup` for IP literals, so the dispatcher alone
 * would let `http://127.0.0.1/` through.
 */
export const assertPublicHost = (url: string) => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (isIP(hostname) === 0) {
    return true;
  }
  return !isBlockedIp(hostname);
};

/**
 * Validating lookup for undici's `connect.lookup`: resolves the hostname with
 * `all: true` and rejects if any resolved address is private/reserved. Called
 * by undici on every redirect hop, so each hop is guarded at the socket layer.
 */
export const validatingLookup: LookupFunction = (hostname, opts, callback) => {
  dns.lookup(
    hostname,
    { ...opts, all: true },
    (err: NodeJS.ErrnoException | null, addresses?: dns.LookupAddress[]) => {
      if (err) {
        return callback(err, '', 0);
      }
      const blocked = (addresses ?? []).filter((a) => isBlockedIp(a.address));
      if (blocked.length > 0) {
        const e = new Error(
          `Blocked: ${hostname} resolves to ${blocked.map((a) => a.address).join(', ')}`,
        ) as NodeJS.ErrnoException;
        e.code = 'ECONNREFUSED';
        return callback(e, '', 0);
      }
      const first = addresses?.[0];
      if (!first) {
        const e = new Error(
          `No addresses resolved for ${hostname}`,
        ) as NodeJS.ErrnoException;
        e.code = 'ECONNREFUSED';
        return callback(e, '', 0);
      }
      callback(null, first.address, first.family);
    },
  );
};

/**
 * Shared dispatcher for both fetches (page + image). Each redirect hop's
 * DNS is validated via `connect.lookup`; the per-hop `assertPublicHost`
 * check in `safeFetch` covers IP-literal hosts, which skip the lookup.
 *
 * `autoSelectFamily: false` is required: with it on (Node's default),
 * undici asks the lookup for the *whole* resolved address list and re-enters
 * it per candidate, which a single-address callback contract cannot satisfy
 * (the second call receives `address` as an array and net.connect rejects it
 * with ERR_INVALID_IP_ADDRESS).
 */
let sharedDispatcher: Dispatcher | undefined;
export const getGuardedDispatcher = (): Dispatcher => {
  if (!sharedDispatcher) {
    sharedDispatcher = new Agent({
      connect: {
        autoSelectFamily: false,
        lookup: validatingLookup,
      },
    });
  }
  return sharedDispatcher;
};

export const PAGE_FETCH_TIMEOUT_MS = 10_000;
export const IMAGE_FETCH_TIMEOUT_MS = 10_000;
export const PAGE_BODY_CAP_BYTES = 1_048_576; // 1 MiB — og: tags live in <head>
export const IMAGE_BODY_CAP_BYTES = 5_242_880; // 5 MiB — bounds memory before sharp

/**
 * fetch() with the SSRF guard, a timeout, and a body-size cap.
 * Streams the body and aborts past the cap so we never buffer more than
 * `cap` bytes into memory.
 *
 * Redirects are followed manually and `assertPublicHost()` runs before every
 * request, including each redirect target: undici opens a fresh connection
 * per hop and skips `connect.lookup` for IP-literal hosts, so a redirect to
 * `http://127.0.0.1/` or `http://169.254.169.254/` never reaches the
 * validating lookup — the guard must run on the URL *before* the socket is
 * opened. Hop count is capped (the default `fetch` follow depth is 20). The
 * timeout signal spans the whole redirect chain.
 */
export const MAX_REDIRECT_HOPS = 20;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export const safeFetch = async (
  url: string,
  opts: {
    capBytes: number;
    timeoutMs: number;
    headers?: Record<string, string>;
  },
): Promise<Response> => {
  // `signal` and `dispatcher` are undici/fetch runtime extensions not part
  // of `RequestInit`'s type surface, so this is declared explicitly.
  type GuardedInit = RequestInit & { dispatcher?: Dispatcher };

  const timeoutSignal = AbortSignal.timeout(opts.timeoutMs);
  const guardedOnce = async (target: string): Promise<Response> => {
    if (!assertPublicHost(target)) {
      throw new Error(`Blocked: ${target}`);
    }
    const init: GuardedInit = {
      headers: opts.headers ?? {},
      dispatcher: getGuardedDispatcher(),
      redirect: 'manual',
      signal: timeoutSignal,
    };
    return fetch(target, init);
  };

  let currentUrl = url;
  let response = await guardedOnce(currentUrl);
  for (let hops = 0; REDIRECT_STATUSES.has(response.status); hops++) {
    if (hops >= MAX_REDIRECT_HOPS) {
      throw new Error(`Too many redirects: ${currentUrl}`);
    }
    const location = response.headers.get('location');
    if (!location) {
      break;
    }
    // Relative Location values resolve against the redirecting URL.
    currentUrl = new URL(location, currentUrl).toString();
    response = await guardedOnce(currentUrl);
  }

  if (!response.body) {
    return response;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    received += value.byteLength;
    if (received > opts.capBytes) {
      await reader.cancel();
      throw new Error(`Body exceeds ${opts.capBytes} bytes`);
    }
    chunks.push(value);
  }
  const body = new Blob(chunks as BlobPart[]);
  return new Response(body, {
    status: response.status,
    headers: response.headers,
  });
};
