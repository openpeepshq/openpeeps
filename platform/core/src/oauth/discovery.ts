import { OAUTH_API_PATH } from '@openpeepshq/common/lib';
import {
  OAUTH_API_RESOURCE_TYPES,
  OAUTH_FULL_ACCESS_SCOPE,
  OIDC_SCOPES,
} from '@openpeepshq/common/types';

/** OIDC Discovery 1.0 §3 / RFC 8414 metadata for this community. */
export const oauthDiscoveryDocument = ({
  issuer,
  registrationEnabled,
}: {
  issuer: string;
  registrationEnabled: boolean;
}) => {
  const api = `${issuer}${OAUTH_API_PATH}`;
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${api}/token`,
    userinfo_endpoint: `${api}/userinfo`,
    jwks_uri: `${api}/jwks`,
    revocation_endpoint: `${api}/revoke`,
    ...(registrationEnabled
      ? { registration_endpoint: `${api}/register` }
      : {}),
    scopes_supported: [
      ...OIDC_SCOPES,
      ...OAUTH_API_RESOURCE_TYPES.flatMap((type) => [
        `${type}:read`,
        `${type}:write`,
      ]),
      OAUTH_FULL_ACCESS_SCOPE,
    ],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    token_endpoint_auth_methods_supported: [
      'none',
      'client_secret_basic',
      'client_secret_post',
    ],
    revocation_endpoint_auth_methods_supported: [
      'none',
      'client_secret_basic',
      'client_secret_post',
    ],
    code_challenge_methods_supported: ['S256'],
    claims_supported: [
      'sub',
      'iss',
      'aud',
      'exp',
      'iat',
      'auth_time',
      'nonce',
      'azp',
      'preferred_username',
      'name',
      'picture',
      'email',
      'email_verified',
    ],
  };
};
