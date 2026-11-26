import { oauthClientRegistrationSchema } from '@openpeepshq/common/types';
import { config } from '../config';
import { createOAuthClient } from './clients';
import { oauthError } from './errors';

/** RFC 7591 dynamic registration; such clients never become first-party. */
export const registerOAuthClient = async (metadata: unknown) => {
  const { oauth } = await config();
  if (!oauth.dynamicRegistration) {
    throw oauthError(
      'registration_disabled',
      'Dynamic client registration is disabled',
    );
  }
  const parsed = oauthClientRegistrationSchema.safeParse(metadata);
  if (!parsed.success) {
    throw oauthError('invalid_client_metadata', parsed.error.message);
  }
  const request = parsed.data;
  const client = await createOAuthClient(
    {
      name: request.client_name ?? 'Unnamed app',
      redirectUris: request.redirect_uris,
      confidential: request.token_endpoint_auth_method !== 'none',
      clientUri: request.client_uri,
      logoUri: request.logo_uri,
    },
    { dynamic: true },
  );
  const secretExpiry =
    client.clientSecret && oauth.clientSecretLifetimeSeconds > 0
      ? Math.floor(
          (Date.now() + oauth.clientSecretLifetimeSeconds * 1000) / 1000,
        )
      : undefined;
  return {
    client_id: client.id,
    client_id_issued_at: Math.floor(Date.parse(client.createdAt) / 1000),
    ...(client.clientSecret
      ? {
          client_secret: client.clientSecret,
          // 0 = never expires (RFC 7591 §3.2.1), e.g. lifetime set to 0.
          client_secret_expires_at: secretExpiry ?? 0,
        }
      : {}),
    client_name: client.name,
    redirect_uris: client.redirectUris,
    token_endpoint_auth_method: request.token_endpoint_auth_method,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    ...(client.clientUri ? { client_uri: client.clientUri } : {}),
    ...(client.logoUri ? { logo_uri: client.logoUri } : {}),
  };
};
