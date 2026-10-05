import { generateKeyPairSync } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { pgDb } from '../db/pg/client';
import { profiles } from '../db/pg/schema/documents';

/** Fedify URI templates; must stay aligned with `actorUri` / `objectUri`. */
export const ACTOR_PATH = '/ap/users/{identifier}' as const;
export const ACTOR_INBOX_PATH = '/ap/users/{identifier}/inbox' as const;
export const SHARED_INBOX_PATH = '/ap/inbox' as const;
export const FOLLOWERS_PATH = '/ap/users/{identifier}/followers' as const;
export const NOTE_PATH = '/ap/objects/{id}' as const;
export const CREATE_PATH = '/ap/create/{id}' as const;
export const ACCEPT_PATH = '/ap/accept/{id}' as const;

export const federationOrigin = (domain: string) => `https://${domain}`;

export const actorUri = (domain: string, profileId: string) =>
  `https://${domain}/ap/users/${profileId}`;

export const objectUri = (domain: string, postId: string) =>
  `https://${domain}/ap/objects/${postId}`;

export const createActivityUri = (domain: string, activityId: string) =>
  `https://${domain}/ap/create/${activityId}`;

export const acceptActivityUri = (domain: string, activityId: string) =>
  `https://${domain}/ap/accept/${activityId}`;

export const generateActorKeyPair = () =>
  generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

export const localActorScalars = (profileId: string, domain: string) => {
  const uri = actorUri(domain, profileId);
  const keys = generateActorKeyPair();
  return {
    uri,
    inboxUrl: `${uri}/inbox`,
    publicKeyPem: keys.publicKey,
    privateKeyPem: keys.privateKey,
    keyId: `${uri}#main-key`,
  };
};

export const localObjectScalars = (
  postId: string,
  domain: string,
  inReplyToId?: string | null,
) => ({
  uri: objectUri(domain, postId),
  inReplyToUri: inReplyToId ? objectUri(domain, inReplyToId) : null,
});

const federationDomain = () =>
  process.env.ACTIVITY_PUB_DEFAULT_DOMAIN || 'localhost';

/** Fill actor/object URIs and local RSA keys after schema migrate. */
export const backfillLocalFederationIdentities = async () => {
  const db = pgDb();
  const domain = federationDomain();
  const locals = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      and(
        eq(profiles.type, 'local'),
        isNull(profiles.uri),
        isNull(profiles.deletedAt),
      ),
    );
  for (const row of locals) {
    await db
      .update(profiles)
      .set(localActorScalars(row.id, domain))
      .where(eq(profiles.id, row.id));
  }
  await db.execute(
    sql`UPDATE posts SET uri = ${`https://${domain}/ap/objects/`} || id::text WHERE uri IS NULL`,
  );
  await db.execute(sql`
    UPDATE posts p
    SET in_reply_to_uri = parent.uri
    FROM reply_to rt
    JOIN posts parent ON parent.id::text = rt.to_id
    WHERE rt.from_id = p.id::text
      AND p.in_reply_to_uri IS NULL
      AND parent.uri IS NOT NULL
  `);
};
