import { passwordPlaceHolder, type CoreConfig } from '../types';

export const SSO_OIDC_KINDS = [
  'oidc',
  'github',
  'gitlab',
  'gitlab-selfhosted',
  'google',
  'entra',
  'auth0',
  'keycloak',
  'authentik',
  'okta',
  'discord',
  'pocketid',
] as const;

export type SsoOidcKind = (typeof SSO_OIDC_KINDS)[number];
export type SsoProviderKind = SsoOidcKind | 'generic';

export const SSO_ADD_KINDS = [
  'gitlab',
  'gitlab-selfhosted',
  'github',
  'google',
  'entra',
  'discord',
  'auth0',
  'okta',
  'keycloak',
  'authentik',
  'pocketid',
  'oidc',
  'generic',
] as const satisfies readonly SsoProviderKind[];

export type OidcProvider = CoreConfig['sso']['oidc'][number];
export type GenericProvider = CoreConfig['sso']['generic'][number];

export type OidcClaimMapping = NonNullable<OidcProvider['claimMapping']>;

export type OidcEndpoints = {
  authorizationUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  emailsUrl?: string;
  jwksUri?: string;
  scope: string;
  claimMapping: OidcClaimMapping;
};

export type TemplateFieldNeed = false | 'optional' | 'required';

export type OidcTemplateNeeds = {
  instanceUrl: TemplateFieldNeed;
  tenant: TemplateFieldNeed;
};

const stripSlash = (url: string) => url.replace(/\/$/, '');

const withHttps = (url: string) => {
  const trimmed = stripSlash(url.trim());
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const isGitHubDotCom = (web: string) =>
  /^https?:\/\/(www\.)?github\.com$/i.test(web);

const oidcClaims = (
  handle = 'preferred_username',
  displayName = 'name',
  avatar = 'picture',
): OidcClaimMapping => ({
  email: 'email',
  handle,
  displayName,
  avatar,
});

export const ssoOidcKind = (provider: { kind?: string }): SsoOidcKind =>
  SSO_OIDC_KINDS.includes(provider.kind as SsoOidcKind)
    ? (provider.kind as SsoOidcKind)
    : 'oidc';

export const oidcTemplateNeeds = (kind: SsoProviderKind): OidcTemplateNeeds => {
  switch (kind) {
    case 'github':
      return { instanceUrl: 'optional', tenant: false };
    case 'gitlab-selfhosted':
    case 'auth0':
    case 'okta':
    case 'pocketid':
      return {
        instanceUrl: 'required',
        tenant: kind === 'okta' ? 'optional' : false,
      };
    case 'keycloak':
    case 'authentik':
      return { instanceUrl: 'required', tenant: 'required' };
    case 'entra':
      return { instanceUrl: false, tenant: 'optional' };
    default:
      return { instanceUrl: false, tenant: false };
  }
};

export const ssoKindDefaultName = (kind: SsoProviderKind): string => {
  switch (kind) {
    case 'gitlab':
    case 'gitlab-selfhosted':
      return 'GitLab';
    case 'github':
      return 'GitHub';
    case 'google':
      return 'Google';
    case 'entra':
      return 'Microsoft';
    case 'discord':
      return 'Discord';
    case 'auth0':
      return 'Auth0';
    case 'okta':
      return 'Okta';
    case 'keycloak':
      return 'Keycloak';
    case 'authentik':
      return 'Authentik';
    case 'pocketid':
      return 'Pocket ID';
    default:
      return '';
  }
};

export const githubOidcEndpoints = (instanceUrl?: string): OidcEndpoints => {
  const web = withHttps(instanceUrl || '') || 'https://github.com';
  const api = isGitHubDotCom(web) ? 'https://api.github.com' : `${web}/api/v3`;
  return {
    authorizationUrl: `${web}/login/oauth/authorize`,
    tokenUrl: `${web}/login/oauth/access_token`,
    userinfoUrl: `${api}/user`,
    emailsUrl: `${api}/user/emails`,
    scope: 'read:user user:email',
    claimMapping: oidcClaims('login', 'name', 'avatar_url'),
  };
};

export const gitlabOidcEndpoints = (instanceUrl?: string): OidcEndpoints => {
  const base = withHttps(instanceUrl || '') || 'https://gitlab.com';
  return {
    authorizationUrl: `${base}/oauth/authorize`,
    tokenUrl: `${base}/oauth/token`,
    userinfoUrl: `${base}/oauth/userinfo`,
    jwksUri: `${base}/oauth/discovery/keys`,
    scope: 'openid email profile',
    claimMapping: oidcClaims('nickname'),
  };
};

export const oidcEndpoints = (
  kind: SsoOidcKind,
  fields: { instanceUrl?: string; tenant?: string } = {},
): OidcEndpoints | undefined => {
  const instance = withHttps(fields.instanceUrl || '');
  const tenant = fields.tenant?.trim();

  switch (kind) {
    case 'github':
      return githubOidcEndpoints(fields.instanceUrl);
    case 'gitlab':
    case 'gitlab-selfhosted':
      return gitlabOidcEndpoints(
        kind === 'gitlab-selfhosted' ? instance : fields.instanceUrl,
      );
    case 'google':
      return {
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
        scope: 'openid email profile',
        claimMapping: oidcClaims('email'),
      };
    case 'entra': {
      const directory = tenant || 'common';
      return {
        authorizationUrl: `https://login.microsoftonline.com/${directory}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${directory}/oauth2/v2.0/token`,
        userinfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
        jwksUri: `https://login.microsoftonline.com/${directory}/discovery/v2.0/keys`,
        scope: 'openid email profile',
        claimMapping: oidcClaims(),
      };
    }
    case 'auth0':
      return {
        authorizationUrl: `${instance}/authorize`,
        tokenUrl: `${instance}/oauth/token`,
        userinfoUrl: `${instance}/userinfo`,
        jwksUri: `${instance}/.well-known/jwks.json`,
        scope: 'openid email profile',
        claimMapping: oidcClaims(),
      };
    case 'keycloak': {
      const realm = `${instance}/realms/${tenant || 'master'}`;
      return {
        authorizationUrl: `${realm}/protocol/openid-connect/auth`,
        tokenUrl: `${realm}/protocol/openid-connect/token`,
        userinfoUrl: `${realm}/protocol/openid-connect/userinfo`,
        jwksUri: `${realm}/protocol/openid-connect/certs`,
        scope: 'openid email profile',
        claimMapping: oidcClaims(),
      };
    }
    case 'authentik':
      return {
        authorizationUrl: `${instance}/application/o/authorize/`,
        tokenUrl: `${instance}/application/o/token/`,
        userinfoUrl: `${instance}/application/o/userinfo/`,
        jwksUri: tenant
          ? `${instance}/application/o/${tenant}/jwks/`
          : undefined,
        scope: 'openid email profile',
        claimMapping: oidcClaims(),
      };
    case 'okta': {
      const server = tenant || 'default';
      return {
        authorizationUrl: `${instance}/oauth2/${server}/v1/authorize`,
        tokenUrl: `${instance}/oauth2/${server}/v1/token`,
        userinfoUrl: `${instance}/oauth2/${server}/v1/userinfo`,
        jwksUri: `${instance}/oauth2/${server}/v1/keys`,
        scope: 'openid email profile',
        claimMapping: oidcClaims(),
      };
    }
    case 'discord':
      return {
        authorizationUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        userinfoUrl: 'https://discord.com/api/users/@me',
        scope: 'identify email',
        claimMapping: oidcClaims('username', 'global_name', 'avatar'),
      };
    case 'pocketid':
      return {
        authorizationUrl: `${instance}/authorize`,
        tokenUrl: `${instance}/api/oidc/token`,
        userinfoUrl: `${instance}/api/oidc/userinfo`,
        jwksUri: `${instance}/.well-known/jwks.json`,
        scope: 'openid email profile',
        claimMapping: oidcClaims(),
      };
    default:
      return undefined;
  }
};

export type OidcProviderFields = {
  id: string;
  name: string;
  instanceUrl?: string;
  tenant?: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
  approvalRequired?: boolean;
  authorizationUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  emailsUrl?: string;
  jwksUri?: string;
  claimMapping?: OidcProvider['claimMapping'];
};

export const applyOidcProvider = (
  kind: SsoOidcKind,
  fields: OidcProviderFields,
): OidcProvider => {
  const tpl = oidcEndpoints(kind, fields);
  if (tpl) {
    return {
      kind,
      id: fields.id.trim(),
      name: fields.name.trim(),
      instanceUrl: fields.instanceUrl?.trim() || undefined,
      tenant: fields.tenant?.trim() || undefined,
      clientId: fields.clientId.trim(),
      clientSecret: fields.clientSecret,
      approvalRequired: fields.approvalRequired,
      scope: fields.scope?.trim() || tpl.scope,
      authorizationUrl: tpl.authorizationUrl,
      tokenUrl: tpl.tokenUrl,
      userinfoUrl: tpl.userinfoUrl,
      emailsUrl: tpl.emailsUrl,
      jwksUri: tpl.jwksUri,
      claimMapping: tpl.claimMapping,
    };
  }

  return {
    kind: 'oidc',
    id: fields.id.trim(),
    name: fields.name.trim(),
    clientId: fields.clientId.trim(),
    clientSecret: fields.clientSecret,
    approvalRequired: fields.approvalRequired,
    scope: fields.scope?.trim() || 'openid email profile',
    authorizationUrl: fields.authorizationUrl?.trim() || '',
    tokenUrl: fields.tokenUrl?.trim() || '',
    userinfoUrl: fields.userinfoUrl?.trim() || '',
    emailsUrl: fields.emailsUrl?.trim() || undefined,
    jwksUri: fields.jwksUri?.trim() || undefined,
    claimMapping: {
      email: fields.claimMapping?.email || 'email',
      handle: fields.claimMapping?.handle || 'preferred_username',
      displayName: fields.claimMapping?.displayName || 'name',
      avatar: fields.claimMapping?.avatar || 'picture',
    },
  };
};

export const applyGenericProvider = (fields: {
  id: string;
  name: string;
  loginLink?: string;
  profileUrl: string;
  authHeader?: string;
  emailPath: string;
  handlePath?: string;
  displayNamePath?: string;
  avatarPath?: string;
  createAccounts?: boolean;
  createProfiles?: boolean;
}): GenericProvider => ({
  id: fields.id.trim(),
  name: fields.name.trim(),
  loginLink: fields.loginLink?.trim() || undefined,
  userProfileRequest: {
    url: fields.profileUrl.trim(),
    authHeader: fields.authHeader?.trim() || undefined,
  },
  userProfilePaths: {
    email: fields.emailPath.trim(),
    handle: fields.handlePath?.trim() || undefined,
    displayName: fields.displayNamePath?.trim() || undefined,
    avatar: fields.avatarPath?.trim() || undefined,
  },
  createAccounts: fields.createAccounts,
  createProfiles: fields.createProfiles,
});

export const githubEmailsUrl = (provider: OidcProvider): string | undefined =>
  provider.emailsUrl ||
  (ssoOidcKind(provider) === 'github'
    ? githubOidcEndpoints(provider.instanceUrl).emailsUrl
    : undefined);

export const discordAvatarUrl = (
  claims: Record<string, unknown>,
): string | undefined => {
  const id = claims.id;
  if (typeof id !== 'string' || !id) return undefined;
  const avatar = claims.avatar;
  if (typeof avatar === 'string' && avatar) {
    const format = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${format}`;
  }
  const discriminator =
    typeof claims.discriminator === 'string' ? claims.discriminator : '0';
  const index =
    discriminator === '0'
      ? Number(BigInt(id) >> BigInt(22)) % 6
      : Number.parseInt(discriminator, 10) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${Number.isFinite(index) ? index : 0}.png`;
};

export const pickOAuthEmail = (emails: unknown): string | undefined => {
  if (!Array.isArray(emails)) return undefined;
  const rows = emails.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const email = (entry as { email?: unknown }).email;
    if (typeof email !== 'string' || !email.includes('@')) return [];
    return [
      {
        email,
        primary: !!(entry as { primary?: unknown }).primary,
        verified: (entry as { verified?: unknown }).verified !== false,
      },
    ];
  });
  return (
    rows.find((row) => row.primary && row.verified)?.email ??
    rows.find((row) => row.verified)?.email ??
    rows[0]?.email
  );
};

export const parseOAuthTokenBody = (
  body: string,
  contentType: string | null,
): Record<string, unknown> => {
  const trimmed = body.trim();
  const type = contentType ?? '';
  if (type.includes('application/json') || trimmed.startsWith('{')) {
    return JSON.parse(trimmed) as Record<string, unknown>;
  }
  return Object.fromEntries(new URLSearchParams(trimmed));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const recordId = (value: unknown): string | undefined => {
  if (!isRecord(value) || typeof value.id !== 'string') return undefined;
  return value.id;
};

/** Keep stored secrets when a sanitized patch still carries the placeholder. */
export const restorePasswordPlaceholders = (
  incoming: unknown,
  existing: unknown,
): unknown => {
  if (incoming === passwordPlaceHolder) {
    return existing === undefined ? incoming : existing;
  }
  if (Array.isArray(incoming)) {
    const existingArr = Array.isArray(existing) ? existing : [];
    return incoming.map((item, index) => {
      const id = recordId(item);
      const match = id
        ? existingArr.find((entry) => recordId(entry) === id)
        : existingArr[index];
      return restorePasswordPlaceholders(item, match);
    });
  }
  if (isRecord(incoming) && isRecord(existing)) {
    return Object.fromEntries(
      Object.entries(incoming).map(([key, value]) => [
        key,
        restorePasswordPlaceholders(value, existing[key]),
      ]),
    );
  }
  return incoming;
};
