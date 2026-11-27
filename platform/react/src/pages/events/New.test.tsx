/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pageHeaderStore, usePageHeader } from '../../stores/pageHeader';
import { NewEvent } from './New';

const state = vi.hoisted(() => ({
  canCreate: false,
  submitReturns: false,
  submitIds: [] as Array<unknown>,
}));
const toastSuccess = vi.hoisted(() => vi.fn());
// Faithful to the real composer: the openpeeps API is rebuilt on every render
// of the provider, so `createPostAction()` — and therefore `submit` — has a
// FRESH identity on every render of the page. A guard that injects a stable
// `submit` mock stays green even when `headerActions` (or a `saveDraft` that
// depends on `submit`) is wired into the page-header dependency chain, because
// the memo then bails out on identity and never re-fires `useSetPageHeader`.
// The fresh ref per render is what makes that divergence visible, exactly as
// in the app.
const submitMock = vi.hoisted(
  () => () =>
    vi.fn(() =>
      Promise.resolve(state.submitReturns),
    ) as unknown as () => Promise<boolean>,
);

vi.mock('../../hooks/events/useEventComposer', () => ({
  useNewEvent: () => {
    // A fresh `submit` per render of the page, mirroring the real composer
    // (see the `submitMock` note above).
    const submit = submitMock();
    state.submitIds.push(submit);
    return {
      postData: { type: 'event', visibility: 'local', data: { type: 'event' } },
      setPostData: () => undefined,
      canCreate: state.canCreate,
      canSubmit: true,
      submitting: false,
      error: null,
      clearError: () => undefined,
      submit,
    };
  },
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
    state.submitIds = [];
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
    // and the page loops forever (React's "Maximum update depth exceeded" aborts
    // the render before the form commits, so `events-form-basic-details` never
    // appears). The sibling Shell above can't catch this because its children
    // element has a stable identity and bails out.
    //
    // The mock composer hands out a FRESH `submit` on every render (mirroring
    // the real app, where the openpeeps API is rebuilt each render). That fresh
    // identity is what exposes any page that wires `submit` — directly or via a
    // `saveDraft` in the memo deps — into `headerActions`: the guard below
    // passes only if the page keeps the header referentially stable regardless.
    state.canCreate = true;
    state.submitIds = [];
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

    // Sanity check the guard actually exercises the failure mode: without the
    // page's own stabilization this loop would re-render NewEvent repeatedly
    // with distinct `submit` identities.
    expect(state.submitIds.length).toBeGreaterThan(1);
    expect(new Set(state.submitIds).size).toBeGreaterThan(1);

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
