/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventDisplayTimeZone } from './useEventDisplayTimeZone';
import { ServerDataContext } from '../../components/server-data';
import type { ServerDataContextValue } from '../../components/server-data';
import { StaticRenderContext } from '../../components/markdown/staticRender';

type Settings = { timeZone?: string } | undefined;

let mockProfileSettings: Settings;
let mockServerData: ServerDataContextValue | null;

vi.mock('../../components/layout/IdentityContext', () => ({
  useIdentity: () => ({ profileSettings: mockProfileSettings }),
}));

// The hook reads ServerDataContext directly; give it a real context so the
// tests can supply (or withhold) the value like the in-app provider does.
vi.mock('../../components/server-data', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    ServerDataContext: React.createContext<ServerDataContextValue | null>(null),
  };
});

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let captured: string | undefined | null;

const renderHook = (
  eventTimeZone?: string | null,
  providers?: (node: ReactNode) => ReactNode,
) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const Host = () => {
    captured = useEventDisplayTimeZone(eventTimeZone);
    return null;
  };
  const tree = createElement(Host);
  act(() => {
    root?.render(providers ? providers(tree) : tree);
  });
};

const withProviders = (node: ReactNode) =>
  createElement(
    StaticRenderContext.Provider,
    { value: { enabled: false } },
    createElement(ServerDataContext.Provider, { value: mockServerData }, node),
  );

describe('useEventDisplayTimeZone tier chain', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockProfileSettings = undefined;
    mockServerData = null;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    captured = undefined;
  });

  it('prefers the profile settings zone over everything else', () => {
    mockProfileSettings = { timeZone: 'America/New_York' };
    mockServerData = {
      serverInfo: {
        communityConfig: { settings: { defaultTimeZone: 'Europe/Berlin' } },
      } as ServerDataContextValue['serverInfo'],
    } as ServerDataContextValue;
    renderHook('America/Chicago', withProviders);
    expect(captured).toBe('America/New_York');
  });

  it('uses the community default before the event zone', () => {
    mockServerData = {
      serverInfo: {
        communityConfig: { settings: { defaultTimeZone: 'Europe/Berlin' } },
      } as ServerDataContextValue['serverInfo'],
    } as ServerDataContextValue;
    renderHook('America/Chicago', withProviders);
    expect(captured).toBe('Europe/Berlin');
  });

  it('falls back to the event zone when no viewer tier applies', () => {
    renderHook('America/Chicago', withProviders);
    expect(captured).toBe('America/Chicago');
  });

  it('returns undefined when nothing resolves so formatters use the device zone', () => {
    renderHook(undefined, withProviders);
    expect(captured).toBeUndefined();
  });

  it('ignores a non-IANA profile setting and keeps the event zone', () => {
    mockProfileSettings = { timeZone: 'Not/AZone' };
    renderHook('America/Chicago', withProviders);
    expect(captured).toBe('America/Chicago');
  });

  it('returns undefined for an invalid event zone with no viewer tier', () => {
    renderHook('Not/AZone', withProviders);
    expect(captured).toBeUndefined();
  });

  it('skips the provider-backed tiers in static renders and falls back to the event zone', () => {
    // Email renders mount StaticRenderContext only — the identity and
    // server-data providers are absent by design, so the hook must degrade
    // to the event zone instead of throwing.
    mockProfileSettings = { timeZone: 'America/New_York' };
    mockServerData = {
      serverInfo: {
        communityConfig: { settings: { defaultTimeZone: 'Europe/Berlin' } },
      } as ServerDataContextValue['serverInfo'],
    } as ServerDataContextValue;
    const staticRender = (node: ReactNode) =>
      createElement(
        StaticRenderContext.Provider,
        { value: { enabled: true, timeZone: 'UTC' } },
        node,
      );
    expect(() => renderHook('America/Chicago', staticRender)).not.toThrow();
    expect(captured).toBe('America/Chicago');
  });

  it('returns undefined in static renders when the event zone is unset', () => {
    const staticRender = (node: ReactNode) =>
      createElement(
        StaticRenderContext.Provider,
        { value: { enabled: true, timeZone: 'UTC' } },
        node,
      );
    renderHook(undefined, staticRender);
    expect(captured).toBeUndefined();
  });
});
