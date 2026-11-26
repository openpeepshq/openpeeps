import { createHash, webcrypto } from 'node:crypto';

type UrlListener = (event: { url: string }) => void;
const listeners = new Set<UrlListener>();
const openURL = jest.fn(async (_url: string) => undefined);

jest.mock('react-native', () => ({
  Linking: {
    openURL: (url: string) => openURL(url),
    addEventListener: (_type: 'url', listener: UrlListener) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  },
}));

// The jest moduleNameMapper pins the `common` root to one module; the OAuth
// client helpers live in their own file.
jest.mock('@openpeepshq/common', () => ({
  ...jest.requireActual('../../../common/src/lib/oauth'),
  OAUTH_FULL_ACCESS_SCOPE: '*:admin',
}));

import {
  createPkcePair,
  isSupersededLogin,
  loginInBrowser,
} from './oauthLogin';

const options = {
  serverUrl: 'https://peeps.example',
  clientId: 'app',
  redirectUri: 'org.example.app:/oauth',
};

const authorizeParams = () =>
  Object.fromEntries(new URL(openURL.mock.calls.at(-1)![0]).searchParams);

const redirect = (url: string) => listeners.forEach((l) => l({ url }));

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
});

beforeEach(() => {
  listeners.clear();
  openURL.mockClear();
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      access_token: 'at',
      refresh_token: 'rt',
      token_type: 'Bearer',
      expires_in: 3600,
    }),
  })) as unknown as typeof fetch;
});

describe('createPkcePair', () => {
  it('derives an S256 challenge from a 43-char verifier', () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toBe(
      createHash('sha256').update(verifier).digest('base64url')
    );
  });
});

describe('loginInBrowser', () => {
  it('opens the authorize page and exchanges the returned code', async () => {
    const result = loginInBrowser(options);
    await flush();
    const params = authorizeParams();
    expect(params).toMatchObject({
      client_id: 'app',
      redirect_uri: options.redirectUri,
      code_challenge_method: 'S256',
      scope: 'openid profile offline_access *:admin',
    });

    redirect(`${options.redirectUri}?code=c1&state=${params.state}`);
    await expect(result).resolves.toEqual({
      token: 'at',
      refreshToken: 'rt',
      clientId: 'app',
    });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://peeps.example/api/openpeeps/core/v1/oauth/token');
    const body = Object.fromEntries(new URLSearchParams(init.body));
    expect(body).toMatchObject({
      grant_type: 'authorization_code',
      code: 'c1',
      client_id: 'app',
    });
    expect(
      createHash('sha256').update(body.code_verifier).digest('base64url')
    ).toBe(params.code_challenge);
  });

  it('rejects a redirect with a foreign state', async () => {
    const result = loginInBrowser(options);
    await flush();
    redirect(`${options.redirectUri}?code=c1&state=forged`);
    await expect(result).rejects.toThrow('OAuth state mismatch');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('surfaces a denied authorization', async () => {
    const result = loginInBrowser(options);
    await flush();
    const { state } = authorizeParams();
    redirect(`${options.redirectUri}?error=access_denied&state=${state}`);
    await expect(result).rejects.toThrow('access_denied');
  });

  it('supersedes an abandoned attempt when the user tries again', async () => {
    const first = loginInBrowser(options);
    await flush();
    const second = loginInBrowser(options);
    const error = await first.catch((err: unknown) => err);
    expect(isSupersededLogin(error)).toBe(true);
    await flush();
    expect(listeners.size).toBe(1);
    redirect(`${options.redirectUri}?code=c2&state=${authorizeParams().state}`);
    await expect(second).resolves.toMatchObject({ token: 'at' });
  });
});
