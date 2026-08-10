import {
  AccessToken,
  AccountWithMeta,
  Authorization,
  ProfileWithMeta,
  Scope,
  authorizationSchema,
} from '@openpeepshq/common/types';
import { uuidv7 } from 'uuidv7';
import { findAccount } from '../accounts/finders';
import { jwtUtil } from '../jwt';
import { findProfile } from '../profiles/finders';
import { findAccessToken, isRevoked } from './finders';
import { createAccessToken, revokeAccessToken } from './mutations';

export const verifySignedAccessToken = (
  token: string,
): Promise<Authorization | undefined> =>
  jwtUtil()
    .then((jwt) => jwt.verify(token))
    .then(async (result) => {
      if (!result?.payload?.jti) {
        return undefined;
      }
      const id = result.payload.jti;

      if (!id || (await isRevoked(id))) {
        return undefined;
      }

      return result.payload as Authorization;
    });

export const createSignedAccessToken = async ({
  profile,
  authorization,
  name,
  description,
  expirationTime,
}: {
  profile?: ProfileWithMeta;
  name: string;
  description?: string;
  authorization: Authorization;
  expirationTime: string;
}) => {
  const id = uuidv7();
  const jwt = await jwtUtil();
  const signedToken = await jwt.sign({
    payload: authorization,
    expirationTime,
    id,
  });
  const result = await jwt.verify(signedToken);
  if (!result?.payload?.exp) {
    throw new Error('Failed to verify signed token');
  }

  const expiresAt = new Date(result.payload.exp * 1000).toISOString();

  return createAccessToken(profile, {
    name,
    description,
    signedToken,
    expiresAt,
  });
};

export const createSignedProfileAccessToken = async ({
  profile,
  account,
  name,
  description,
  scopes = [{ scopeLevel: 'admin', resource: { type: '*', id: '*' } }],
  expirationTime = '1y',
}: {
  profile?: ProfileWithMeta;
  account?: AccountWithMeta;
  name: string;
  description?: string;
  scopes?: [Scope, ...Scope[]];
  expirationTime: string;
}) => {
  const authorization: Authorization = {
    identities: {
      profile: profile?.id,
      account: account?.id,
    },
    scopes,
  };
  return createSignedAccessToken({
    profile,
    authorization,
    name,
    description,
    expirationTime,
  });
};

export const createSignedServiceToken = async ({
  scopes,
  name,
  description,
  expirationTime = '1y',
}: {
  scopes: Scope[];
  name: string;
  description?: string;
  expirationTime: string;
}) =>
  createSignedAccessToken({
    name,
    description,
    authorization: {
      identities: {
        service: uuidv7(),
      },
      scopes,
    },
    expirationTime,
  });

export const createSignedGuestPass = async (
  profile: ProfileWithMeta,
  expirationTime: string = '1d',
) => {
  if (!profile.guestData?.resource) {
    throw new Error('Guest pass requires a resource');
  }
  return createSignedAccessToken({
    profile,
    name: profile.handle,
    authorization: {
      identities: {
        profile: profile.id,
      },
      scopes: [
        {
          scopeLevel: 'read',
          resource: profile.guestData?.resource,
        },
      ],
    },
    expirationTime,
  });
};

export const createSignedDbToken = (profile: ProfileWithMeta) =>
  createSignedAccessToken({
    profile,
    name: 'db-admin',
    expirationTime: '1h',
    authorization: {
      identities: {
        profile: profile.id,
      },
      scopes: [
        {
          scopeLevel: 'admin',
          resource: {
            type: 'db',
            id: uuidv7(),
          },
        },
      ],
    },
  });

/**
 * Issues a new JWT with the same {@link Authorization} (profile/account/service identities and scopes)
 * as the presented token. Requires a valid, unexpired JWT (EdDSA + standard `exp` checks), then checks
 * revocation and revokes the old token record.
 */
export const refreshSignedAccessToken = async (
  token: string,
): Promise<AccessToken | undefined> => {
  const jwt = await jwtUtil();
  const verified = await jwt.verify(token);
  const rawPayload = verified?.payload;
  if (!rawPayload?.jti || typeof rawPayload.jti !== 'string') {
    return undefined;
  }

  const jti = rawPayload.jti;
  if (await isRevoked(jti)) {
    return undefined;
  }

  const exp = typeof rawPayload.exp === 'number' ? rawPayload.exp : undefined;
  const iat = typeof rawPayload.iat === 'number' ? rawPayload.iat : undefined;

  const authParsed = authorizationSchema.safeParse(rawPayload);
  if (!authParsed.success) {
    return undefined;
  }
  const authorization = authParsed.data;

  const existing = await findAccessToken(jti);
  if (!existing?.signedToken || existing.revokedAt) {
    return undefined;
  }

  if (authorization.identities.profile) {
    const p = await findProfile(authorization.identities.profile);
    if (!p || p.deletedAt) {
      return undefined;
    }
  }
  if (authorization.identities.account) {
    const a = await findAccount(authorization.identities.account);
    if (!a || a.deletedAt) {
      return undefined;
    }
  }

  let ttlSec: number;
  if (existing.expiresAt && existing.createdAt) {
    ttlSec = Math.floor(
      (new Date(existing.expiresAt).getTime() -
        new Date(existing.createdAt).getTime()) /
        1000,
    );
  } else if (exp !== undefined && iat !== undefined) {
    ttlSec = exp - iat;
  } else {
    ttlSec = 7 * 24 * 60 * 60;
  }
  const expirationTime = `${ttlSec}s`;

  const profile = authorization.identities.profile
    ? await findProfile(authorization.identities.profile)
    : undefined;

  const accessToken = await createSignedAccessToken({
    profile,
    authorization,
    name: existing.name,
    description: existing.description,
    expirationTime,
  });

  await revokeAccessToken(jti);

  return accessToken;
};
