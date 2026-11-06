/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  confirmJamTabClose,
  rejectJamBackNavigation,
  useJamTabCloseGuard,
} from './useJamTabCloseGuard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../i18n', () => ({
  useT: () => (_key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}));

const Harness = ({ active }: { active: boolean }) => {
  useJamTabCloseGuard(active);
  return null;
};

const dispatchBeforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true });
  const continued = window.dispatchEvent(event);
  return { continued, event: event as BeforeUnloadEvent };
};

describe('confirmJamTabClose', () => {
  it('cancels unload', () => {
    const preventDefault = vi.fn();
    const event = { preventDefault, returnValue: '' } as BeforeUnloadEvent;

    expect(confirmJamTabClose(event)).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(event.returnValue).toBe(true);
  });
});

describe('rejectJamBackNavigation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stops the pop and steps forward to the jam', () => {
    const stopImmediatePropagation = vi.fn();
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    const event = { stopImmediatePropagation } as unknown as PopStateEvent;

    rejectJamBackNavigation(event);

    expect(stopImmediatePropagation).toHaveBeenCalledOnce();
    expect(go).toHaveBeenCalledWith(1);
  });
});

describe('useJamTabCloseGuard', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
    vi.restoreAllMocks();
  });

  const mount = (active: boolean) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(Harness, { active }));
    });
  };

  const renderActive = (active: boolean) => {
    act(() => {
      root?.render(createElement(Harness, { active }));
    });
  };

  it('prompts on reload while a call is active', () => {
    mount(true);
    expect(window.onbeforeunload).toEqual(expect.any(Function));
    const { continued, event } = dispatchBeforeUnload();
    expect(continued).toBe(false);
    expect(event.defaultPrevented).toBe(true);
  });

  it('keeps the reload prompt if the call drops while the tab is hidden', () => {
    mount(true);
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');
    renderActive(false);
    visibility.mockReturnValue('visible');

    expect(dispatchBeforeUnload().continued).toBe(false);
  });

  it('stays quiet before the call starts', () => {
    mount(false);
    expect(dispatchBeforeUnload().continued).toBe(true);
  });

  it('stops prompting once the call ends on a visible page', () => {
    mount(true);
    renderActive(false);
    expect(dispatchBeforeUnload().continued).toBe(true);
  });

  it('asks before the browser back button leaves the jam', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    mount(true);

    const event = new PopStateEvent('popstate');
    const stop = vi.spyOn(event, 'stopImmediatePropagation');
    window.dispatchEvent(event);

    expect(confirm).toHaveBeenCalledWith(
      'Are you sure you want to exit this jam?',
    );
    expect(stop).toHaveBeenCalledOnce();
    expect(go).toHaveBeenCalledWith(1);
  });

  it('allows back after the leave is confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const go = vi.spyOn(window.history, 'go');
    mount(true);

    const event = new PopStateEvent('popstate');
    const stop = vi.spyOn(event, 'stopImmediatePropagation');
    window.dispatchEvent(event);

    expect(stop).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });

  it('does not ask on back before the call starts', () => {
    const confirm = vi.spyOn(window, 'confirm');
    mount(false);
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(confirm).not.toHaveBeenCalled();
  });
});
