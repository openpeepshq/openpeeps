/** @vitest-environment jsdom */
import { act, createElement, type ReactElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hookState } = vi.hoisted(() => ({
  hookState: {
    dirty: false,
    saving: false,
    save: () => {},
  },
}));

vi.mock('../../index', () => ({
  useT: () => (key: string, opts?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'common.submit': 'Submit',
      'common.submitting': 'Submitting…',
      'settings.notifications.unsavedChanges': 'You have unsaved changes.',
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
    me: { id: 'me' },
    types: [],
    settings: { notifications: {} },
    dirty: hookState.dirty,
    saving: hookState.saving,
    save: () => hookState.save(),
    status: null,
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
  Toast: (props: { children?: ReactNode }) =>
    createElement('div', null, props.children),
}));

import { NotificationPreferences } from './NotificationPreferences';

describe('NotificationPreferences', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    hookState.dirty = false;
    hookState.saving = false;
    hookState.save = vi.fn();
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

  it('shows only the inline save button while there are no unsaved changes', () => {
    render(createElement(NotificationPreferences));
    expect(
      container?.querySelector('[data-testid=settings-unsaved-bar]'),
    ).toBeNull();
    expect(
      container?.querySelectorAll('[data-testid=settings-save-button]'),
    ).toHaveLength(1);
  });

  it('shows the sticky unsaved bar with the single save button when dirty', () => {
    hookState.dirty = true;
    render(createElement(NotificationPreferences));
    const bar = container?.querySelector('[data-testid=settings-unsaved-bar]');
    expect(bar).not.toBeNull();
    expect(bar?.textContent).toContain('You have unsaved changes.');
    const buttons = container?.querySelectorAll(
      '[data-testid=settings-save-button]',
    );
    expect(buttons).toHaveLength(1);
    expect(
      bar?.querySelector('[data-testid=settings-save-button]'),
    ).not.toBeNull();
  });

  it('saves via the bar button when dirty', () => {
    hookState.dirty = true;
    render(createElement(NotificationPreferences));
    const button = container?.querySelector(
      '[data-testid=settings-unsaved-bar] [data-testid=settings-save-button]',
    ) as HTMLButtonElement;
    act(() => {
      button.click();
    });
    expect(hookState.save).toHaveBeenCalledTimes(1);
  });
});
