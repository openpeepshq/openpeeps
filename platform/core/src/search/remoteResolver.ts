import type { ProfileWithMeta } from '@openpeepshq/common/types';
import { peerHostAllowed } from '../federation/peers';
import { findProfileByHandleAndDomain } from '../federation/profiles';
import { upsertRemoteActor } from '../federation/actors';
import type { RemoteActorInput } from '../federation/actors';
import { logger } from '../log';

const log = logger('app:search:remote-identity');

/**
 * Parsed form of a remote-identity search query: a local handle plus the
 * remote server it lives on. `null` means the query is local-only (no
 * `@domain`, no actor URL) and the resolver must skip the network entirely.
 */
export type RemoteIdentity = {
  handle: string;
  domain: string;
};

/**
 * Fetches the canonical `RemoteActorInput` for a remote identity using the
 * fedify `Federation` instance owned by the server. Returned as an injected
 * dependency so `platform/core` never imports `@fedify/fedify` (server-only).
 * Must resolve `undefined` (never throw) when the actor cannot be fetched.
 */
export type RemoteIdentityFetcher = (
  identity: RemoteIdentity,
) => Promise<RemoteActorInput | undefined>;

const MAX_REMOTE_QUERY_LENGTH = 512;

/**
 * Parses a remote-identity search query into a `{handle, domain}` pair.
 *
 * Accepted shapes:
 * - `@bob@mastodon.social` / `bob@mastodon.social` (two `@`, or one `@` + a
 *   dotted server host)
 * - a profile URL `https://mastodon.social/@bob` / `https://mastodon.social/bob`
 *
 * Local queries (a bare `@bob`, a dotted word, or plain text) return `null` —
 * the caller then does an ordinary local search with zero new network traffic.
 *
 * Handles are preserved exactly as typed — no lowercasing, no trimming beyond
 * the `@` prefix; only the domain is normalized (lowercased, trailing dot
 * stripped). Callers must not assume case-insensitive identity keys.
 */
export const parseRemoteIdentity = (
  rawQuery: string,
): RemoteIdentity | null => {
  const query = rawQuery.trim();
  if (query.length === 0 || query.length > MAX_REMOTE_QUERY_LENGTH) {
    return null;
  }
  // Whitespace means a free-text search, not a single identity.
  if (/\s/.test(query)) return null;

  if (/^https?:\/\//i.test(query)) {
    try {
      const url = new URL(query);
      const host = url.hostname.trim().toLowerCase().replace(/\.$/, '');
      if (!host) return null;
      // The last path segment is the handle; ignore `@` prefixes.
      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      const handle = (lastSegment ?? '').replace(/^@/, '').trim();
      if (!handle) return null;
      return { handle, domain: host };
    } catch {
      return null;
    }
  }

  if (!query.includes('@')) return null;

  const atIndex = query.lastIndexOf('@');
  const afterAt = query.slice(atIndex + 1);
  // A remote domain is a valid hostname with at least one dot (bare names are
  // local handles, e.g. `@bob`), so `@bob` stays local.
  if (!afterAt.includes('.')) return null;
  const handle = query.slice(0, atIndex).replace(/^@/, '').trim();
  const domain = afterAt.toLowerCase().replace(/\.$/, '');
  if (!handle || !domain) return null;
  return { handle, domain };
};

/**
 * Resolves a remote identity typed into profile search into a stored,
 * discoverable profile so the existing (local + federated) search picks it up.
 *
 * - Local-only queries return `undefined` without any network call.
 * - Already-ingested actors are returned directly (idempotent, no fetch).
 * - Unknown actors are fetched via `fetchRemoteActor` and persisted with
 *   `upsertRemoteActor`. Any fetch/ingest failure resolves `undefined` —
 *   search still returns local hits.
 */
export const resolveRemoteIdentity = async (
  query: string,
  fetchRemoteActor: RemoteIdentityFetcher,
): Promise<ProfileWithMeta | undefined> => {
  const identity = parseRemoteIdentity(query);
  if (!identity) return undefined;

  // Deny hosts on the federation blocklist (deny wins).
  if (!(await peerHostAllowed(identity.domain))) return undefined;

  const existing = await findProfileByHandleAndDomain(
    identity.handle,
    identity.domain,
  );
  if (existing) return existing;

  let input: RemoteActorInput | undefined;
  try {
    input = await fetchRemoteActor(identity);
  } catch (error) {
    log.warn(
      `Failed to fetch remote actor ${identity.handle}@${identity.domain}`,
      error,
    );
    return undefined;
  }
  if (!input) return undefined;

  try {
    return await upsertRemoteActor(input);
  } catch (error) {
    log.warn(
      `Failed to upsert remote actor ${identity.handle}@${identity.domain}`,
      error,
    );
    return undefined;
  }
};

/**
 * True when the query is remote-looking (has `@domain` or an actor URL). Used
 * by callers to decide whether to invoke the resolver at all. Delegates to
 * the parser so the guard and the parser can never drift apart.
 */
export const isRemoteIdentityQuery = (query: string): boolean =>
  parseRemoteIdentity(query) !== null;

/**
 * Score assigned to the freshly resolved remote identity when the caller
 * prepends it to the first page of results. A finite sentinel rather than
 * `Infinity`: it must survive riddl's zod output validation (`score:
 * z.number()` rejects `Infinity`) and `JSON.stringify` (which renders
 * `Infinity` as `null`), while still outranking any `ts_rank` score, which is
 * bounded to [0,1]. Mirrors the `Number.MAX_SAFE_INTEGER` rank sentinel in
 * `db/pg/map/relations.ts`.
 */
export const PREPENDED_SCORE = Number.MAX_SAFE_INTEGER;
