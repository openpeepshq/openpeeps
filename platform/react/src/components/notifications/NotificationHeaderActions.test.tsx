/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationHeaderActions } from './NotificationHeaderActions';

// The Radix dropdown stays open across toggles because each item's `onSelect`
// calls `preventDefault()`. jsdom has no layout for the floating menu, so the
// dropdown primitives are mocked to render their content inline and to capture
// each item's `onSelect` handler; the test then drives the component's real
// wiring — the `onSelect` handler (preventDefault + toggle), the
// `role`/`aria-checked` state, and the conditional "Show all types" row.
const onSelectHandlers = new Map<
  string,
  (event: { preventDefault: () => void }) => void
>();

vi.mock('@openpeepshq/react-ui', () => ({
  Button: ({ children, title, action, ...rest }: any) =>
    createElement(
      'button',
      {
        title,
        'data-testid': rest['data-testid'],
        onClick: typeof action === 'function' ? action : undefined,
      },
      children,
    ),
  Checkbox: ({ checked }: any) =>
    createElement('span', { 'data-checked': String(!!checked) }),
  DropdownMenu: ({ children }: any) => children,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) =>
    createElement(
      'div',
      { 'data-testid': 'notifications-filter-menu' },
      children,
    ),
  DropdownMenuLabel: ({ children }: any) => children,
  DropdownMenuSeparator: () => createElement('hr'),
  DropdownMenuItem: (props: any) => {
    const { children, onSelect, ...rest } = props;
    if (onSelect && rest['data-testid']) {
      onSelectHandlers.set(rest['data-testid'], onSelect);
    }
    return createElement('button', rest, children);
  },
}));

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      markAllNotificationsAsSeenAction: () => async () => undefined,
    },
    queryClient: {},
  }),
}));

vi.mock('../../lib/notificationBadge', () => ({
  markCachedNotificationsSeen: () => {},
}));

vi.mock('../layout/ToastProvider', () => ({
  useToast: () => ({ success: () => {}, error: () => {} }),
}));

// A controllable stand-in for the feed-filter hook: `toggle`/`showAll` mutate a
// backing set and trigger a re-render so the aria state visibly updates, which
// is what the assertions below observe.
const TYPES = [{ type: 'repost' }, { type: 'poll_vote' }, { type: 'jam' }];
let hidden: Set<string>;
const listeners = new Set<() => void>();
const toggle = vi.fn(async (type: string) => {
  if (hidden.has(type)) hidden.delete(type);
  else hidden.add(type);
  listeners.forEach((l) => l());
});
const showAll = vi.fn(async () => {
  hidden.clear();
  listeners.forEach((l) => l());
});

vi.mock('../../hooks', async () => {
  const React = await import('react');
  return {
    useNotificationFeedFilter: () => {
      const [, force] = React.useReducer((x: number) => x + 1, 0);
      React.useEffect(() => {
        const l = () => force();
        listeners.add(l);
        return () => {
          listeners.delete(l);
        };
      }, []);
      return {
        types: TYPES,
        hiddenTypes: hidden,
        isHidden: (type: string) => hidden.has(type),
        toggle,
        showAll,
        hasFilter: hidden.size > 0,
        excludeTypes: hidden.size ? [...hidden].sort().join(',') : undefined,
      };
    },
  };
});

describe('NotificationHeaderActions (web filter menu)', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    hidden = new Set(['repost']); // start with one type hidden
    onSelectHandlers.clear();
    toggle.mockClear();
    showAll.mockClear();
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
    listeners.clear();
  });

  function render() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(NotificationHeaderActions));
    });
  }

  function ariaChecked(type: string): string {
    return container!
      .querySelector(`[data-testid="notifications-filter-${type}"]`)!
      .getAttribute('aria-checked')!;
  }

  // Activate a menu item the way Radix does on selection: invoke its captured
  // `onSelect`. Returns whether the handler prevented the default (i.e. kept
  // the menu open).
  function selectRow(type: string): boolean {
    let prevented = false;
    act(() => {
      onSelectHandlers.get(`notifications-filter-${type}`)?.({
        preventDefault: () => {
          prevented = true;
        },
      });
    });
    return prevented;
  }

  it('renders each type as a menuitemcheckbox with the correct checked state', () => {
    render();
    expect(
      container!.querySelectorAll('[role="menuitemcheckbox"]'),
    ).toHaveLength(TYPES.length);
    expect(ariaChecked('repost')).toBe('false'); // hidden
    expect(ariaChecked('poll_vote')).toBe('true'); // visible
    expect(ariaChecked('jam')).toBe('true'); // visible
  });

  it('keeps the menu open across toggles and updates the checked state', async () => {
    render();
    // Toggle poll_vote (visible) to hidden.
    expect(selectRow('poll_vote')).toBe(true);
    expect(toggle).toHaveBeenCalledWith('poll_vote');
    expect(ariaChecked('poll_vote')).toBe('false');
    // The "Show all types" row appears now that a filter is active.
    expect(
      container!.querySelector('[data-testid="notifications-filter-show-all"]'),
    ).toBeTruthy();
  });

  it('a second toggle in the same session also keeps the menu open and is cumulative', async () => {
    render();
    expect(selectRow('poll_vote')).toBe(true);
    expect(selectRow('jam')).toBe(true);
    // Both toggles landed on the shared state.
    expect(ariaChecked('poll_vote')).toBe('false');
    expect(ariaChecked('jam')).toBe('false');
    expect(ariaChecked('repost')).toBe('false');
    expect(toggle).toHaveBeenCalledTimes(2);
  });

  it('"Show all types" clears the filter and removes the row', async () => {
    render();
    expect(
      container!.querySelector('[data-testid="notifications-filter-show-all"]'),
    ).toBeTruthy();
    await act(async () => {
      showAll();
    });
    expect(showAll).toHaveBeenCalled();
    expect(ariaChecked('repost')).toBe('true');
    expect(
      container!.querySelector('[data-testid="notifications-filter-show-all"]'),
    ).toBeNull();
  });
});
