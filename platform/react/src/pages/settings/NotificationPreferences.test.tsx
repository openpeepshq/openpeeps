/** @vitest-environment jsdom */
import { act, createElement, type ReactElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hookState } = vi.hoisted(() => ({
  hookState: {
    settingsLoading: false,
    settingsError: false,
    retrySettings: () => {},
    me: { id: 'me' } as { id: string } | null,
    dirty: false,
    saving: false,
    save: () => {},
    status: null as { type: 'success' | 'error'; message: string } | null,
  },
}));

vi.mock('../../index', () => ({
  useT: () => (key: string, opts?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'common.submit': 'Submit',
      'common.submitting': 'Submitting…',
      'settings.notifications.unsavedChanges': 'You have unsaved changes.',
      'settings.notifications.loadError':
        'Could not load your notification preferences.',
      'settings.notifications.retry': 'Retry',
      'settings.notifications.updateSuccess': 'Notification settings updated.',
      'settings.notifications.description':
        'Choose how you want to be notified about activity.',
      'settings.notifications.pushSettings': 'Push settings',
      'settings.notifications.serverPushDisabled':
        'Push notifications are not configured on this server.',
    };
    return (translations[key] ?? key).replace(
      /\{\{(\w+)\}\}/g,
      (_match: string, name: string) => opts?.[name] ?? '',
    );
  },
  useOpenpeeps: () => ({
    client: {},
    openpeepsApi: { testPushSubscriptionAction: () => vi.fn(async () => {}) },
  }),
  useSetPageHeader: () => undefined,
  usePushSubscription: () => ({
    isSubscribed: false,
    isLoading: false,
    hasServiceWorker: false,
    isSupported: false,
    subscribe: vi.fn(async () => null),
    unsubscribe: vi.fn(async () => {}),
  }),
  getPushSubscription: vi.fn(),
  isBraveBrowser: () => false,
  subscribePushNotifications: vi.fn(async () => {}),
}));

vi.mock('../../components', () => ({
  useServerInfo: () => ({ vapid: { publicKey: undefined } }),
}));

vi.mock('../../hooks', () => ({
  useNotificationPreferences: () => ({
    me: hookState.me,
    types: [],
    settings: { notifications: {} },
    settingsLoading: hookState.settingsLoading,
    settingsError: hookState.settingsError,
    retrySettings: hookState.retrySettings,
    dirty: hookState.dirty,
    saving: hookState.saving,
    save: () => hookState.save(),
    status: hookState.status,
    setTypeSettings: () => {},
    clearStatus: () => {},
  }),
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Button: (props: { children?: ReactNode } & Record<string, unknown>) =>
    createElement(
      'button',
      {
        'data-testid': props['data-testid'],
        disabled: props.disabled,
        onClick:
          typeof props.action === 'function'
            ? () => {
                (props.action as () => void)();
              }
            : undefined,
      },
      props.children,
    ),
  LoadingSpinner: (props: Record<string, unknown>) =>
    createElement('div', { 'data-testid': 'loading-spinner', ...props }),
  // Mirrors the real Toast's a11y contract: success → status, error → alert.
  Toast: (props: { children?: ReactNode; variant?: 'success' | 'error' }) =>
    createElement(
      'div',
      {
        'data-testid': 'toast',
        'data-variant': props.variant,
        role: props.variant === 'error' ? 'alert' : 'status',
      },
      props.children,
    ),
}));

import { NotificationPreferences } from './NotificationPreferences';

describe('NotificationPreferences', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    hookState.settingsLoading = false;
    hookState.settingsError = false;
    hookState.retrySettings = vi.fn();
    hookState.me = { id: 'me' };
    hookState.dirty = false;
    hookState.saving = false;
    hookState.save = vi.fn();
    hookState.status = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = (element: ReactElement) => {
    act(() => {
      root?.render(element);
    });
  };

  const saveButton = () =>
    container?.querySelector(
      '[data-testid=settings-save-button]',
    ) as HTMLButtonElement | null;

  it('shows a loading indicator (no form, no save bar) while settings load', () => {
    hookState.settingsLoading = true;
    render(createElement(NotificationPreferences));
    expect(saveButton()).toBeNull();
    expect(
      container?.querySelector('[data-testid=loading-spinner]'),
    ).not.toBeNull();
  });

  it('renders an error state with a retry button when the settings query fails', () => {
    hookState.settingsError = true;
    render(createElement(NotificationPreferences));
    expect(saveButton()).toBeNull();
    expect(
      container?.querySelector('[data-testid=loading-spinner]'),
    ).toBeNull();
    expect(container?.textContent).toContain(
      'Could not load your notification preferences.',
    );
    const retry = container?.querySelector(
      '[data-testid=settings-retry-button]',
    ) as HTMLButtonElement | null;
    expect(retry).not.toBeNull();
    act(() => {
      retry?.click();
    });
    expect(hookState.retrySettings).toHaveBeenCalledTimes(1);
  });

  it('renders the persistent save bar with the button disabled when clean', () => {
    render(createElement(NotificationPreferences));
    const bar = container?.querySelector('[role=status]');
    expect(bar).not.toBeNull();
    // The "unsaved changes" text is absent while clean.
    expect(bar?.textContent).not.toContain('You have unsaved changes');
    const button = saveButton();
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
  });

  it('renders the save bar as a full-width sibling, not nested inside the inset section', () => {
    render(createElement(NotificationPreferences));
    const button = saveButton();
    expect(button).not.toBeNull();
    const bar = button?.closest('[role=status]') as HTMLElement | null;
    expect(bar).not.toBeNull();
    // The bar must not sit inside the inset content <section> (p-4 + mr-4),
    // whose box it could not fully escape — that nesting is what made the bar
    // fall short of the screen edges on mobile.
    expect(bar?.closest('section')).toBeNull();
    // And it declares full width so it spans the content column edge-to-edge.
    expect(bar?.className).toContain('w-full');
  });

  it('shows the unsaved-changes text and enables the button when dirty', () => {
    hookState.dirty = true;
    render(createElement(NotificationPreferences));
    const bar = container?.querySelector('[role=status]');
    expect(bar).not.toBeNull();
    expect(bar?.textContent).toContain('You have unsaved changes');
    const button = saveButton();
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(false);
    // Exactly one save button, inside the persistent bar.
    expect(
      container?.querySelectorAll('[data-testid=settings-save-button]'),
    ).toHaveLength(1);
    expect(bar?.contains(button)).toBe(true);
  });

  it('disables the button while saving even when dirty', () => {
    hookState.dirty = true;
    hookState.saving = true;
    render(createElement(NotificationPreferences));
    expect(saveButton()?.disabled).toBe(true);
  });

  it('saves via the bar button when dirty', () => {
    hookState.dirty = true;
    render(createElement(NotificationPreferences));
    const button = saveButton();
    act(() => {
      button?.click();
    });
    expect(hookState.save).toHaveBeenCalledTimes(1);
  });

  it('renders the save error in a toast exposed as an alert live region', () => {
    hookState.dirty = true;
    hookState.status = {
      type: 'error',
      message: 'Could not save your changes.',
    };
    render(createElement(NotificationPreferences));
    const toast = container?.querySelector('[data-testid=toast]');
    expect(toast).not.toBeNull();
    expect(toast?.getAttribute('role')).toBe('alert');
    expect(container?.textContent).toContain('Could not save your changes.');
  });

  it('announces the save success in a status live region', () => {
    hookState.status = {
      type: 'success',
      message: 'Notification settings updated.',
    };
    render(createElement(NotificationPreferences));
    const toast = container?.querySelector('[data-testid=toast]');
    expect(toast?.getAttribute('role')).toBe('status');
    expect(container?.textContent).toContain('Notification settings updated.');
  });

  it('exposes the retry control as a real button to assistive tech', () => {
    hookState.settingsError = true;
    render(createElement(NotificationPreferences));
    const retry = container?.querySelector(
      '[data-testid=settings-retry-button]',
    );
    expect(retry?.tagName).toBe('BUTTON');
    expect(
      Array.from(container?.querySelectorAll('button') ?? []).some(
        (b) => b.textContent === 'Retry',
      ),
    ).toBe(true);
  });
});
