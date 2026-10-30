/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pageHeaderStore, usePageHeader } from '../../stores/pageHeader';
import { NewEvent } from './New';

const state = vi.hoisted(() => ({ canCreate: false }));

vi.mock('../../hooks/events/useEventComposer', () => ({
  useNewEvent: () => ({
    postData: { type: 'event', visibility: 'local', data: { type: 'event' } },
    setPostData: () => undefined,
    canCreate: state.canCreate,
    canSubmit: true,
    submitting: false,
    error: null,
    clearError: () => undefined,
    submit: () => undefined,
  }),
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
});
