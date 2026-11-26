/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  info: undefined as unknown,
  authorize: vi.fn(),
  token: 'tok' as string | undefined,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useOAuthAuthorizationInfo: () => ({
        data: mocks.info,
        isLoading: false,
        error: null,
      }),
      authorizeOAuthAction: () => mocks.authorize,
    },
  }),
}));
vi.mock('../../contexts/credentialsStore', () => ({
  useCredentialsStore: () => ({
    credentialsStore: {
      get: async () => (mocks.token ? { token: mocks.token } : null),
    },
  }),
}));
vi.mock('../../i18n/context', () => ({
  useT: () => (key: string) => key,
}));

import { oauthScopeLabelKey, useOAuthConsent } from './useOAuthConsent';

const request = { client_id: 'c1', redirect_uri: 'org.example.app:/cb' };
const client = { id: 'c1', name: 'App' };
let root: Root | undefined;
let captured: ReturnType<typeof useOAuthConsent>;
const onRedirect = vi.fn();

const render = async () => {
  const container = document.createElement('div');
  root = createRoot(container);
  const Host = () => {
    captured = useOAuthConsent(request, onRedirect);
    return null;
  };
  await act(async () => {
    root?.render(createElement(Host));
  });
};

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.token = 'tok';
  mocks.authorize.mockReset().mockResolvedValue({ redirectUrl: 'app:/cb?x' });
  onRedirect.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
});

describe('useOAuthConsent', () => {
  it('reports a signed-out visitor so the page can send them to login', async () => {
    mocks.token = undefined;
    mocks.info = undefined;
    await render();
    expect(captured.signedIn).toBe(false);
  });

  it('waits for the user on a consent prompt and redirects after a decision', async () => {
    mocks.info = {
      status: 'consent',
      client,
      scopes: ['openid'],
      autoApprove: false,
    };
    await render();
    expect(mocks.authorize).not.toHaveBeenCalled();
    await act(() => captured.decide(false));
    expect(mocks.authorize).toHaveBeenCalledWith({
      ...request,
      approve: false,
    });
    expect(onRedirect).toHaveBeenCalledWith('app:/cb?x');
  });

  it('approves without a prompt when every scope is already granted', async () => {
    mocks.info = {
      status: 'consent',
      client,
      scopes: ['openid'],
      autoApprove: true,
    };
    await render();
    expect(mocks.authorize).toHaveBeenCalledWith({ ...request, approve: true });
    expect(onRedirect).toHaveBeenCalledWith('app:/cb?x');
  });

  it('follows a server-side error redirect', async () => {
    mocks.info = { status: 'redirect', redirectUrl: 'app:/cb?error=x' };
    await render();
    expect(onRedirect).toHaveBeenCalledWith('app:/cb?error=x');
    expect(mocks.authorize).not.toHaveBeenCalled();
  });
});

describe('oauthScopeLabelKey', () => {
  it('avoids the i18next namespace separator', () => {
    expect(oauthScopeLabelKey('posts:read')).toBe('oauth.scopes.posts_read');
    expect(oauthScopeLabelKey('openid')).toBe('oauth.scopes.openid');
  });
});
