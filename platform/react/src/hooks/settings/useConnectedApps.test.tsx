/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  grants: undefined as unknown[],
  revoke: vi.fn(),
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useOAuthGrants: () => ({
        data: mocks.grants,
        isLoading: false,
        error: null,
      }),
      revokeOAuthGrantAction: () => mocks.revoke,
    },
  }),
}));

import { useConnectedApps } from './useConnectedApps';

let root: Root | undefined;
let captured: ReturnType<typeof useConnectedApps>;

const render = async () => {
  const container = document.createElement('div');
  root = createRoot(container);
  const Host = () => {
    captured = useConnectedApps();
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
  mocks.grants = undefined;
  mocks.revoke.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => root?.unmount());
});

describe('useConnectedApps', () => {
  it('defaults to an empty grant list while the query is undefined', async () => {
    mocks.grants = undefined;
    await render();
    expect(captured.grants).toEqual([]);
    expect(captured.isLoading).toBe(false);
  });

  it('exposes the grants and revokes one by client id', async () => {
    mocks.grants = [
      {
        profileId: 'p1',
        clientId: 'c1',
        scopes: ['openid'],
        createdAt: '',
        updatedAt: '',
      },
    ];
    await render();
    expect(captured.grants).toHaveLength(1);
    await act(async () => {
      await captured.revoke('c1');
    });
    expect(mocks.revoke).toHaveBeenCalledWith({ clientId: 'c1' });
  });
});
