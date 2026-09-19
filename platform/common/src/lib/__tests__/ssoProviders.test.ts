import { describe, expect, it } from 'vitest';
import { passwordPlaceHolder } from '../../types';
import {
  applyOidcProvider,
  discordAvatarUrl,
  githubOidcEndpoints,
  gitlabOidcEndpoints,
  oidcEndpoints,
  parseOAuthTokenBody,
  pickOAuthEmail,
  restorePasswordPlaceholders,
  ssoOidcKind,
} from '../ssoProviders';

describe('githubOidcEndpoints', () => {
  it('uses github.com web + api.github.com for the public cloud', () => {
    expect(githubOidcEndpoints()).toEqual({
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userinfoUrl: 'https://api.github.com/user',
      emailsUrl: 'https://api.github.com/user/emails',
      scope: 'read:user user:email',
      claimMapping: {
        email: 'email',
        handle: 'login',
        displayName: 'name',
        avatar: 'avatar_url',
      },
    });
  });

  it('keeps web and API on the same host for GitHub Enterprise', () => {
    const urls = githubOidcEndpoints('https://github.example.com/');
    expect(urls.authorizationUrl).toBe(
      'https://github.example.com/login/oauth/authorize',
    );
    expect(urls.userinfoUrl).toBe('https://github.example.com/api/v3/user');
    expect(urls.emailsUrl).toBe(
      'https://github.example.com/api/v3/user/emails',
    );
  });
});

describe('gitlabOidcEndpoints', () => {
  it('uses GitLab.com OIDC paths by default', () => {
    expect(gitlabOidcEndpoints().jwksUri).toBe(
      'https://gitlab.com/oauth/discovery/keys',
    );
  });

  it('rewrites a self-hosted GitLab base URL', () => {
    const urls = gitlabOidcEndpoints('https://gitlab.example.com');
    expect(urls.authorizationUrl).toBe(
      'https://gitlab.example.com/oauth/authorize',
    );
    expect(urls.userinfoUrl).toBe('https://gitlab.example.com/oauth/userinfo');
  });
});

describe('applyOidcProvider', () => {
  it('stores GitHub template URLs and kind on save', () => {
    const provider = applyOidcProvider('github', {
      id: 'gh',
      name: 'GitHub',
      clientId: 'abc',
      clientSecret: 'secret',
    });
    expect(provider.kind).toBe('github');
    expect(provider.authorizationUrl).toBe(
      githubOidcEndpoints().authorizationUrl,
    );
    expect(provider.emailsUrl).toBe(githubOidcEndpoints().emailsUrl);
    expect(provider.claimMapping?.handle).toBe('login');
  });

  it('stores GitLab.com URLs when instance URL is omitted', () => {
    const provider = applyOidcProvider('gitlab', {
      id: 'gl',
      name: 'GitLab',
      clientId: 'abc',
    });
    expect(provider.kind).toBe('gitlab');
    expect(provider.jwksUri).toBe(gitlabOidcEndpoints().jwksUri);
  });

  it('requires a host for self-hosted GitLab and Pocket ID', () => {
    const gitlab = applyOidcProvider('gitlab-selfhosted', {
      id: 'gls',
      name: 'GitLab',
      instanceUrl: 'gitlab.example.com',
      clientId: 'abc',
    });
    expect(gitlab.kind).toBe('gitlab-selfhosted');
    expect(gitlab.authorizationUrl).toBe(
      'https://gitlab.example.com/oauth/authorize',
    );
    const pocket = applyOidcProvider('pocketid', {
      id: 'pid',
      name: 'Pocket ID',
      instanceUrl: 'https://id.example.com',
      clientId: 'abc',
    });
    expect(pocket.tokenUrl).toBe('https://id.example.com/api/oidc/token');
    expect(pocket.jwksUri).toBe('https://id.example.com/.well-known/jwks.json');
  });

  it('fills Google, Entra, Keycloak, Authentik, Okta, and Discord', () => {
    expect(oidcEndpoints('google')?.authorizationUrl).toContain(
      'accounts.google.com',
    );
    expect(oidcEndpoints('entra')?.authorizationUrl).toContain(
      '/common/oauth2/v2.0/authorize',
    );
    expect(
      oidcEndpoints('entra', { tenant: 'contoso.onmicrosoft.com' })?.tokenUrl,
    ).toContain('contoso.onmicrosoft.com');
    expect(
      oidcEndpoints('keycloak', {
        instanceUrl: 'https://sso.example.com',
        tenant: 'community',
      })?.userinfoUrl,
    ).toBe(
      'https://sso.example.com/realms/community/protocol/openid-connect/userinfo',
    );
    expect(
      oidcEndpoints('authentik', {
        instanceUrl: 'https://auth.example.com',
        tenant: 'openpeeps',
      })?.jwksUri,
    ).toBe('https://auth.example.com/application/o/openpeeps/jwks/');
    expect(
      oidcEndpoints('okta', { instanceUrl: 'https://dev-1.okta.com' })
        ?.tokenUrl,
    ).toBe('https://dev-1.okta.com/oauth2/default/v1/token');
    expect(oidcEndpoints('discord')?.userinfoUrl).toBe(
      'https://discord.com/api/users/@me',
    );
  });
});

describe('discordAvatarUrl', () => {
  it('builds a CDN URL from id and avatar hash', () => {
    expect(
      discordAvatarUrl({ id: '99', avatar: 'abc', discriminator: '0' }),
    ).toBe('https://cdn.discordapp.com/avatars/99/abc.png');
  });
});

describe('ssoOidcKind', () => {
  it('preserves known kinds and treats missing kind as generic OIDC', () => {
    expect(ssoOidcKind({})).toBe('oidc');
    expect(ssoOidcKind({ kind: 'github' })).toBe('github');
    expect(ssoOidcKind({ kind: 'pocketid' })).toBe('pocketid');
  });
});

describe('pickOAuthEmail', () => {
  it('prefers a primary verified address', () => {
    expect(
      pickOAuthEmail([
        { email: 'other@example.com', primary: false, verified: true },
        { email: 'me@example.com', primary: true, verified: true },
      ]),
    ).toBe('me@example.com');
  });

  it('falls back to any verified, then the first address', () => {
    expect(
      pickOAuthEmail([
        { email: 'old@example.com', primary: true, verified: false },
        { email: 'ok@example.com', verified: true },
      ]),
    ).toBe('ok@example.com');
    expect(pickOAuthEmail([{ email: 'only@example.com' }])).toBe(
      'only@example.com',
    );
    expect(pickOAuthEmail('nope')).toBeUndefined();
  });
});

describe('parseOAuthTokenBody', () => {
  it('parses JSON and form-encoded GitHub tokens', () => {
    expect(
      parseOAuthTokenBody(
        '{"access_token":"tok","token_type":"bearer"}',
        'application/json',
      ),
    ).toEqual({ access_token: 'tok', token_type: 'bearer' });
    expect(
      parseOAuthTokenBody(
        'access_token=tok&token_type=bearer',
        'application/x-www-form-urlencoded',
      ),
    ).toEqual({ access_token: 'tok', token_type: 'bearer' });
  });
});

describe('restorePasswordPlaceholders', () => {
  it('keeps stored secrets when a patch still has the placeholder', () => {
    expect(
      restorePasswordPlaceholders(
        {
          sso: {
            oidc: [
              { id: 'gh', clientSecret: passwordPlaceHolder },
              { id: 'new', clientSecret: 'fresh' },
            ],
          },
        },
        {
          sso: {
            oidc: [{ id: 'gh', clientSecret: 'stored-secret' }],
          },
        },
      ),
    ).toEqual({
      sso: {
        oidc: [
          { id: 'gh', clientSecret: 'stored-secret' },
          { id: 'new', clientSecret: 'fresh' },
        ],
      },
    });
  });
});
