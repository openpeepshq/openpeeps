import { Object as ApObject, type Actor } from '@fedify/fedify/vocab';
import { hostnameOf } from '@openpeepshq/core/federation';
import type {
  RemoteIdentity,
  RemoteIdentityFetcher,
} from '@openpeepshq/core/search';
import { asText, getActiveFederation } from '../federation/fedify';

/**
 * The fedify-backed `RemoteIdentityFetcher` used by the server search path.
 * Resolves a remote identity via WebFinger (`acct:handle@domain`) and loads
 * the actor document with the federation's document/context loaders, mapping
 * the result to the same `RemoteActorInput` shape the inbound Follow/Create
 * listeners use so `upsertRemoteActor` stores it identically.
 *
 * Returns `undefined` (never throws) when federation is inactive, the actor
 * cannot be found, or the document cannot be parsed.
 */
export const fedifyRemoteIdentityFetcher: RemoteIdentityFetcher = async (
  identity: RemoteIdentity,
) => {
  const active = getActiveFederation();
  if (!active) return undefined;
  const { federation, origin } = active;

  // A fresh context per fetch (no request-scoped cache) is intentional:
  // fedify contexts are cheap and stateless, so sharing one across calls
  // would only add mutable state.
  const ctx = federation.createContext(new URL(`${origin}/`), undefined);

  let descriptor;
  try {
    descriptor = await ctx.lookupWebFinger(
      `acct:${identity.handle}@${identity.domain}`,
    );
  } catch {
    return undefined;
  }
  if (!descriptor) return undefined;

  // Prefer the ActivityPub self link; fall back to the webfinger subject.
  const selfHref =
    descriptor.links?.find(
      (link) =>
        link.rel === 'self' &&
        (link.type?.includes('activity') || link.type?.includes('ld+json')),
    )?.href ?? descriptor.subject;
  if (!selfHref) return undefined;

  let remoteDocument;
  try {
    remoteDocument = await ctx.documentLoader(selfHref);
  } catch {
    return undefined;
  }

  let actor: Actor;
  try {
    actor = (await ApObject.fromJsonLd(remoteDocument.document, {
      documentLoader: ctx.documentLoader,
      contextLoader: ctx.contextLoader,
      baseUrl: new URL(selfHref),
    })) as unknown as Actor;
  } catch {
    return undefined;
  }
  if (!actor.id) return undefined;

  return {
    uri: actor.id.href,
    handle: identity.handle,
    domain: hostnameOf(actor.id) ?? identity.domain,
    inboxUrl: actor.inboxId?.href,
    sharedInboxUrl: actor.endpoints?.sharedInbox?.href ?? null,
    avatar: actor.imageId?.href ?? null,
    displayName: asText(actor.name),
    bio: asText(actor.summary),
    // publicKeyPem intentionally omitted: this is a search-time preview, and
    // the key arrives (and is ingested) with the first authenticated
    // interaction via the inbound Follow/Create listeners.
  };
};
