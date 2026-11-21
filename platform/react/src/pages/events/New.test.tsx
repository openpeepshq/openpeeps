/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pageHeaderStore, usePageHeader } from '../../stores/pageHeader';
import { NewEvent } from './New';

const state = vi.hoisted(() => ({ canCreate: false, submitReturns: false }));
const toastSuccess = vi.hoisted(() => vi.fn());
// Faithful to the real composer, whose `submit` is a stable useCallback:
// a fresh ref every render would itself drive header re-renders.
const submitMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve(state.submitReturns)),
);

vi.mock('../../hooks/events/useEventComposer', () => ({
  useNewEvent: () => ({
    postData: { type: 'event', visibility: 'local', data: { type: 'event' } },
    setPostData: () => undefined,
    canCreate: state.canCreate,
    canSubmit: true,
    submitting: false,
    error: null,
    clearError: () => undefined,
    submit: submitMock,
  }),
}));

vi.mock('../../components/layout/ToastProvider', () => ({
  useToast: () => ({ success: toastSuccess, error: () => undefined }),
}));

vi.mock('../../components', () => ({
  EventForm: () => createElement('div', { 'data-testid': 'events-form' }),
}));

vi.mock('../../index', async () => {
  const { useSetPageHeader } = await import('../../stores/pageHeader');
  const t = (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key;
  return { useT: () => t, useSetPageHeader };
});

const Shell = ({ children }: { children: ReactNode }) => {
  const header = usePageHeader();
  return createElement('div', null, header?.actions, children);
};

const text = (container: HTMLElement) => container.textContent ?? '';

describe('NewEvent page', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state.canCreate = false;
    state.submitReturns = false;
    toastSuccess.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    pageHeaderStore.set(undefined);
  });

  const render = () => {
    act(() => {
      root?.render(createElement(Shell, null, createElement(NewEvent)));
    });
  };

  it('explains the restriction before showing the form', () => {
    render();
    expect(text(container!)).toContain("You can't create events");
    expect(text(container!)).toContain(
      "Your role isn't allowed to create events.",
    );
    expect(container!.querySelector('[data-testid="events-form"]')).toBeNull();
    expect(
      container!.querySelector('[data-testid="events-create-submit"]'),
    ).toBeNull();
  });

  it('shows the form when the profile can create events', () => {
    state.canCreate = true;
    render();
    expect(
      container!.querySelector('[data-testid="events-form"]'),
    ).not.toBeNull();
    expect(
      container!.querySelector('[data-testid="events-create-submit"]'),
    ).not.toBeNull();
    expect(text(container!)).not.toContain("You can't create events");
  });

  it('settles when a pageHeader subscriber re-renders the page', () => {
    // Regression guard for the integration "form never appears" failure. In the
    // real app the pageHeader consumer (OpenpeepsContextProvider / ContentHeader)
    // is an ANCESTOR of the route, so each pageHeaderStore.set re-renders it and
    // re-creates the route element, re-rendering NewEvent. If the header actions
    // are not referentially stable, that re-renders NewEvent with a fresh
    // headerActions, the useSetPageHeader effect re-fires, sets the store again,
    // and the page loops forever. The sibling Shell above can't catch this
    // because its children element has a stable identity and bails out.
    state.canCreate = true;
    let setCount = 0;
    const unsubscribe = pageHeaderStore.subscribe(() => {
      setCount += 1;
    });

    const Subscriber = () => {
      const header = usePageHeader();
      return createElement(
        'div',
        { 'data-testid': 'shell' },
        header?.actions,
        // New element each render, exactly like the app re-creating <Routes>.
        createElement(NewEvent),
      );
    };

    expect(() => {
      act(() => {
        root!.render(createElement(Subscriber));
      });
    }).not.toThrow();

    expect(
      container!.querySelector('[data-testid="events-form"]'),
    ).not.toBeNull();
    // The header is written once on mount, not on every render.
    expect(setCount).toBeLessThanOrEqual(2);
    unsubscribe();
  });

  it('shows the draft-saved toast when saving a draft succeeds', async () => {
    state.canCreate = true;
    state.submitReturns = true;
    render();
    await act(async () => {
      container!
        .querySelector('[data-testid="events-save-draft"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(toastSuccess).toHaveBeenCalledWith('Draft saved');
  });
});
