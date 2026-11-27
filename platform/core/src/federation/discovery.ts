/**
 * Remote-actor discovery for outbound follows (#241).
 *
 * Resolves a `user@domain` / `@user@domain` handle (via WebFinger) or an
 * `https` actor URL into a `federated` profile row, so a local user can
 * initiate a follow of an account that has never interacted with the
 * instance. Pure `fetch`, no new dependency.
 */
import type { ProfileWithMeta } from '@openpeepshq/common/types';
import { config } from '../config';
import {
  federatedHandleFrom,
  upsertRemoteActor,
  type RemoteActorInput,
} from './actors';
import { peerHostAllowed } from './peers';

/**
 * Extract the first non-empty string from a value that may be a plain string
 * or an ActivityStreams LanguageMap (`{ "en": "hi" }`).
 */
export const asText = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (typeof value === 'string') return value.length > 0 ? value : undefined;
  if (typeof value === 'object' && !Array.isArray(value)) {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      if (typeof entry === 'string' && entry.length > 0) return entry;
    }
    return undefined;
  }
  const text = String(value);
  return text.length > 0 ? text : undefined;
};

/** Coerce to an `http(s)` URL, or `undefined` if it isn't one. */
export const asHttpUrl = (
  value: string | null | undefined,
): URL | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url
      : undefined;
  } catch {
    return undefined;
  }
};

type ParsedQuery =
  | { kind: 'handle'; user: string; domain: string }
  | { kind: 'url'; url: string }
  | null;

/**
 * Split a discovery query. Accepts `user@domain`, `@user@domain`, or an
 * `http(s)` actor URL. Returns `null` when nothing sensible can be parsed.
 */
export const parseRemoteAccountQuery = (query: string): ParsedQuery => {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const httpUrl = asHttpUrl(trimmed);
  if (httpUrl) return { kind: 'url', url: httpUrl.href };
  const bare = trimmed.replace(/^@/, '');
  const at = bare.lastIndexOf('@');
  if (at <= 0 || at === bare.length - 1) return null;
  const user = bare.slice(0, at).trim();
  const domain = bare
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
  if (!user || !domain) return null;
  return { kind: 'handle', user, domain };
};

type WebfingerBody = {
  links?: { rel?: string; type?: string; href?: string }[];
};

type ActorDoc = {
  id?: string;
  preferredUsername?: unknown;
  name?: unknown;
  summary?: unknown;
  inbox?: unknown;
  endpoints?: { sharedInbox?: unknown };
  publicKey?: { id?: unknown; owner?: unknown; publicKeyPem?: unknown };
  icon?: { url?: unknown } | { url?: unknown }[];
  image?: { url?: unknown } | { url?: unknown }[];
};

const firstImageUrl = (
  icon: ActorDoc['icon'] | ActorDoc['image'],
): string | undefined => {
  if (!icon) return undefined;
  const list = Array.isArray(icon) ? icon : [icon];
  for (const entry of list) {
    const url = asHttpUrl(asText(entry?.url));
    if (url) return url.href;
  }
  return undefined;
};

/**
 * Map a raw ActivityStreams actor document onto the `RemoteActorInput` shape
 * consumed by {@link upsertRemoteActor}. Pure — no I/O.
 */
export const actorDocToRemoteInput = (
  doc: ActorDoc,
): RemoteActorInput | undefined => {
  const uri = asHttpUrl(asText(doc.id));
  if (!uri) return undefined;
  return {
    uri: uri.href,
    handle: federatedHandleFrom(asText(doc.preferredUsername), uri.href),
    domain: uri.hostname.toLowerCase().replace(/\.$/, ''),
    inboxUrl: asText(doc.inbox) ?? null,
    sharedInboxUrl: asText(doc.endpoints?.sharedInbox) ?? null,
    publicKeyPem: asText(doc.publicKey?.publicKeyPem) ?? null,
    displayName: asText(doc.name),
    bio: asText(doc.summary),
    avatar: firstImageUrl(doc.icon ?? doc.image) ?? null,
  };
};

const requestTimeout = async (): Promise<number> =>
  (await config()).activityPub.federation.requestTimeout;

/**
 * Resolve `query` to a `federated` profile, upserting the remote actor if it
 * isn't already known. Returns `undefined` when the host is not on the
 * allowlist, WebFinger finds no `self` link, the actor can't be resolved, or
 * the actor has no inbox (unfederatable) — the caller maps this to a 404.
 * Network/timeout/redirect failures propagate so the caller can surface them
 * as a 5xx.
 */
export const resolveRemoteAccount = async (
  query: string,
): Promise<ProfileWithMeta | undefined> => {
  const parsed = parseRemoteAccountQuery(query);
  if (!parsed) return undefined;

  let actorUrl: URL | undefined;

  if (parsed.kind === 'handle') {
    const { user, domain } = parsed;
    // Gate on a URL, not the bare domain: `peerHostAllowed` resolves the
    // host via `hostnameOf` (`new URL`), which throws on a scheme-less
    // string and would deny every allowlisted host (review #1).
    if (!(await peerHostAllowed(new URL(`https://${domain}/`))))
      return undefined;
    const timeoutMs = await requestTimeout();
    const webfingerUrl = `https://${domain}/.well-known/webfinger?resource=acct:${user}@${domain}`;
    const webfinger = await fetch(webfingerUrl, {
      signal: AbortSignal.timeout(timeoutMs),
      // No redirect-following: a 302 away from the allowlisted host (e.g. to
      // an internal address) must not bypass `peerHostAllowed` mid-flight
      // (#241 review #5). Redirects throw and surface as a 5xx.
      redirect: 'error',
    });
    if (!webfinger.ok) return undefined;
    const body = (await webfinger.json()) as WebfingerBody;
    const selfLink = body.links?.find(
      (link) =>
        link.rel === 'self' && link.type === 'application/activity+json',
    );
    actorUrl = asHttpUrl(selfLink?.href);
    if (!actorUrl) return undefined;
  } else {
    actorUrl = new URL(parsed.url);
  }

  // Pass the URL itself, not `hostnameOf(actorUrl)`: `peerHostAllowed`
  // re-runs `hostnameOf` internally, and a bare hostname string would be
  // rejected again (review #1).
  if (!(await peerHostAllowed(actorUrl))) return undefined;

  const timeoutMs = await requestTimeout();
  const actorRes = await fetch(actorUrl.href, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/activity+json, application/ld+json' },
    redirect: 'error',
  });
  if (!actorRes.ok) return undefined;
  const doc = (await actorRes.json()) as ActorDoc;
  const input = actorDocToRemoteInput(doc);
  // An actor without an inbox can't receive the outbound Follow, so following
  // it would federate nothing. Treat it as unresolvable (404) rather than
  // upserting a profile row that can never be federated to (#241 review #6).
  if (!input || !input.inboxUrl) return undefined;
  return upsertRemoteActor(input);
};
