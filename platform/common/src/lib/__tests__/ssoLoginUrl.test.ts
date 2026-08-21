import { describe, expect, it } from 'vitest';
import {
  isAllowedSsoLoginUrl,
  LOCAL_LOGIN_PARAM,
  oidcAuthorizePath,
  publicSsoInfo,
  resolveOnlySsoView,
  ssoLoginDestinations,
} from '../ssoLoginUrl';
import type { CoreConfig } from '../../types';

const emptySso = {
  generic: [],
  oidc: [],
} as CoreConfig['sso'];

const mockOidc = {
  id: 'mock',
  name: 'Mock',
  authorizationUrl: 'https://example.com/authorize',
  tokenUrl: 'https://example.com/token',
  userinfoUrl: 'https://example.com/userinfo',
  clientId: 'client',
} as CoreConfig['sso']['oidc'][number];

const mockGeneric = {
  id: 'wp',
  name: 'WordPress',
  loginLink: 'https://idp.example.com/login',
  userProfileRequest: {
    url: 'https://idp.example.com/profile',
    authHeader: 'Bearer ${token}',
  },
  userProfilePaths: {
    email: '$.email',
  },
} as CoreConfig['sso']['generic'][number];

describe('isAllowedSsoLoginUrl', () => {
  it('allows same-origin paths', () => {
    expect(isAllowedSsoLoginUrl(oidcAuthorizePath('company'))).toBe(true);
  });

  it('allows http and https URLs', () => {
    expect(isAllowedSsoLoginUrl('https://idp.example.com/login')).toBe(true);
    expect(isAllowedSsoLoginUrl('http://localhost:8080/sso')).toBe(true);
  });

  it('rejects protocol-relative, blank, and non-http URLs', () => {
    expect(isAllowedSsoLoginUrl('')).toBe(false);
    expect(isAllowedSsoLoginUrl('   ')).toBe(false);
    expect(isAllowedSsoLoginUrl('//evil.example/phish')).toBe(false);
    expect(isAllowedSsoLoginUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedSsoLoginUrl('not a url')).toBe(false);
  });
});

describe('ssoLoginDestinations', () => {
  it('includes every generic and OIDC provider', () => {
    expect(
      ssoLoginDestinations({
        generic: [
          {
            id: 'wp',
            name: 'WordPress',
            loginLink: 'https://idp.example.com/login',
          },
        ],
        oidc: [{ id: 'mock', name: 'Mock' }],
      }),
    ).toEqual([
      {
        href: 'https://idp.example.com/login',
        name: 'WordPress',
        testId: 'auth-login-generic-wp',
      },
      {
        href: oidcAuthorizePath('mock'),
        name: 'Mock',
        testId: 'auth-login-oidc-mock',
      },
    ]);
  });
});

describe('resolveOnlySsoView', () => {
  it('keeps the password form when onlySSO is off', () => {
    expect(
      resolveOnlySsoView(
        { generic: [], oidc: [{ id: 'mock', name: 'Mock' }] },
        new URLSearchParams(),
      ),
    ).toEqual({ mode: 'form' });
  });

  it('redirects when onlySSO is on and there is one destination', () => {
    expect(
      resolveOnlySsoView(
        {
          onlySSO: true,
          generic: [],
          oidc: [{ id: 'mock', name: 'Mock' }],
        },
        new URLSearchParams(),
      ),
    ).toEqual({
      mode: 'redirect',
      href: oidcAuthorizePath('mock'),
    });
  });

  it('redirects to a generic login link when it is the only destination', () => {
    expect(
      resolveOnlySsoView(
        {
          onlySSO: true,
          generic: [
            {
              id: 'wp',
              name: 'WordPress',
              loginLink: 'https://idp.example.com/login',
            },
          ],
          oidc: [],
        },
        new URLSearchParams(),
      ),
    ).toEqual({
      mode: 'redirect',
      href: 'https://idp.example.com/login',
    });
  });

  it('offers a chooser when several destinations are enabled', () => {
    const view = resolveOnlySsoView(
      {
        onlySSO: true,
        generic: [
          {
            id: 'wp',
            name: 'WordPress',
            loginLink: 'https://idp.example.com/login',
          },
        ],
        oidc: [{ id: 'mock', name: 'Mock' }],
      },
      new URLSearchParams(),
    );
    expect(view.mode).toBe('chooser');
    if (view.mode === 'chooser') {
      expect(view.destinations).toHaveLength(2);
    }
  });

  it('keeps the password form when local login is requested', () => {
    expect(
      resolveOnlySsoView(
        {
          onlySSO: true,
          generic: [],
          oidc: [{ id: 'mock', name: 'Mock' }],
        },
        new URLSearchParams(`${LOCAL_LOGIN_PARAM}=1`),
      ),
    ).toEqual({ mode: 'form' });
  });
});

describe('publicSsoInfo', () => {
  it('omits sso when nothing is configured', () => {
    expect(publicSsoInfo(emptySso)).toBeUndefined();
  });

  it('exposes onlySSO and each provider with a login destination', () => {
    expect(
      publicSsoInfo({
        ...emptySso,
        onlySSO: true,
        generic: [mockGeneric],
        oidc: [mockOidc],
      }),
    ).toEqual({
      onlySSO: true,
      generic: [
        {
          id: 'wp',
          name: 'WordPress',
          loginLink: 'https://idp.example.com/login',
        },
      ],
      oidc: [{ id: 'mock', name: 'Mock' }],
    });
  });

  it('drops generic providers with disallowed login links', () => {
    expect(
      publicSsoInfo({
        generic: [
          {
            ...mockGeneric,
            loginLink: 'javascript:alert(1)',
          },
        ],
        oidc: [mockOidc],
      }),
    ).toEqual({
      generic: [],
      oidc: [{ id: 'mock', name: 'Mock' }],
    });
  });

  it('exposes generic providers even when OIDC is empty', () => {
    expect(
      publicSsoInfo({
        generic: [mockGeneric],
        oidc: [],
      }),
    ).toEqual({
      generic: [
        {
          id: 'wp',
          name: 'WordPress',
          loginLink: 'https://idp.example.com/login',
        },
      ],
      oidc: [],
    });
  });
});
