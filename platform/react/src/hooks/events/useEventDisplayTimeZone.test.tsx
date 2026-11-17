/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventDisplayTimeZone } from './useEventDisplayTimeZone';

type Settings = { timeZone?: string } | undefined;
type ServerInfo =
  | {
      communityConfig?: { settings?: { defaultTimeZone?: string } };
    }
  | undefined;

let mockSettings: Settings;
let mockServerInfo: ServerInfo;

vi.mock('../../components/layout/IdentityContext', () => ({
  useCurrentProfileSettings: () => mockSettings,
}));

vi.mock('../../components/server-data', () => ({
  useServerInfo: () => mockServerInfo,
}));

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let captured: string | undefined | null;

const renderHook = (eventTimeZone?: string | null) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const Host = () => {
    captured = useEventDisplayTimeZone(eventTimeZone);
    return null;
  };
  act(() => {
    root?.render(createElement(Host));
  });
};

describe('useEventDisplayTimeZone tier chain', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockSettings = undefined;
    mockServerInfo = undefined;
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
    mockSettings = { timeZone: 'America/New_York' };
    mockServerInfo = {
      communityConfig: { settings: { defaultTimeZone: 'Europe/Berlin' } },
    };
    renderHook('America/Chicago');
    expect(captured).toBe('America/New_York');
  });

  it('uses the community default before the event zone', () => {
    mockServerInfo = {
      communityConfig: { settings: { defaultTimeZone: 'Europe/Berlin' } },
    };
    renderHook('America/Chicago');
    expect(captured).toBe('Europe/Berlin');
  });

  it('falls back to the event zone when no viewer tier applies', () => {
    renderHook('America/Chicago');
    expect(captured).toBe('America/Chicago');
  });

  it('returns undefined when nothing resolves so formatters use the device zone', () => {
    renderHook(undefined);
    expect(captured).toBeUndefined();
  });

  it('ignores a non-IANA profile setting and keeps the event zone', () => {
    mockSettings = { timeZone: 'Not/AZone' };
    renderHook('America/Chicago');
    expect(captured).toBe('America/Chicago');
  });

  it('returns undefined for an invalid event zone with no viewer tier', () => {
    renderHook('Not/AZone');
    expect(captured).toBeUndefined();
  });
});
