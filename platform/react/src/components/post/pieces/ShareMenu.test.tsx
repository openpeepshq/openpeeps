/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareMenu } from './ShareMenu';

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

const state = {
  signedIn: true,
  toasts: [] as { type: string; message: string }[],
  calls: [] as string[],
  /** props seen by the picker stubs (rendered only when open) */
  pickerProps: {
    group: {} as Record<string, unknown>,
    conversation: {} as Record<string, unknown>,
  },
  /** group ids `checkGroupCapabilities` should pass (group-picker tests) */
  postableGroupIds: new Set<string>(),
  // picker stub inputs (identity + data API are consumed only by pickers)
  me: { id: 'me-1' },
  authData: {},
  openpeepsApi: {},
};

vi.mock('../../../hooks/posts/useShareMenu', () => ({
  postPublicPath: (post: { id: string }) => `/posts/${post.id}`,
  useShareMenu: () => ({
    signedIn: state.signedIn,
    isEvent: false,
    repost: () => {},
    shareIntoGroup: (groupId: string) => {
      state.calls.push(`shareIntoGroup:${groupId}`);
      return Promise.resolve();
    },
    sendToConversation: (conversation: { length: number }) => {
      state.calls.push(`sendToConversation:${conversation.length}`);
      return Promise.resolve();
    },
    eventIcsFile: () => null,
  }),
}));

vi.mock('../../conversations/CreateNewConversationContext', () => ({
  useCreateNewConversation: () => ({
    openCreateConversation: () => {},
  }),
}));

vi.mock('../../layout/ToastProvider', () => ({
  useToast: () => ({
    success: (message: string) =>
      state.toasts.push({ type: 'success', message }),
    error: (message: string) => state.toasts.push({ type: 'error', message }),
  }),
}));

// Pickers pull IdentityContext (me/authData) and the data API; the capability
// filter is mocked so the group-picker test can prove the picker only lists
// groups the mock says are postable (the real check runs in common/lib).
vi.mock('../../layout/IdentityContext', () => ({
  useCurrentProfile: () => state.me,
  useAuthData: () => state.authData,
}));

vi.mock('../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({ openpeepsApi: state.openpeepsApi }),
}));

vi.mock('@openpeepshq/common/lib', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openpeepshq/common/lib')>();
  return {
    ...actual,
    checkGroupCapabilities: vi.fn(
      (_authData: unknown, _caps: string[], group: { id: string }) =>
        state.postableGroupIds.has(group.id)
          ? { success: true }
          : { success: false },
    ),
  };
});

vi.mock('./ShareIntoGroupPicker', async () => {
  const React = await import('react');
  return {
    ShareIntoGroupPicker: (props: {
      open?: boolean;
      onShare?: (groupId: string) => Promise<void>;
      onOpenChange?: (open: boolean) => void;
    }) => {
      state.pickerProps.group = props as unknown as Record<string, unknown>;
      return React.createElement(
        'div',
        { 'data-testid': 'group-picker' },
        props.open
          ? React.createElement(
              'button',
              {
                type: 'button',
                'data-testid': 'group-picker-select',
                onClick: () =>
                  props
                    .onShare?.('group-1')
                    .then(() => props.onOpenChange?.(false)),
              },
              'select group-1',
            )
          : null,
      );
    },
  };
});

vi.mock('./SendToConversationPicker', async () => {
  const React = await import('react');
  return {
    SendToConversationPicker: (props: {
      open?: boolean;
      onSend?: (conversation: unknown[]) => Promise<void>;
      onOpenChange?: (open: boolean) => void;
    }) => {
      state.pickerProps.conversation = props as unknown as Record<
        string,
        unknown
      >;
      return React.createElement(
        'div',
        { 'data-testid': 'conversation-picker' },
        props.open
          ? React.createElement(
              'button',
              {
                type: 'button',
                'data-testid': 'conversation-picker-send',
                onClick: () =>
                  props.onSend?.([{}]).then(() => props.onOpenChange?.(false)),
              },
              'send to conversation',
            )
          : null,
      );
    },
  };
});

// The real PopupMenu (Radix DropdownMenu) mounts its items in a portal only
// once opened, which jsdom tests cannot drive. Substitute a static menu: the
// items render unconditionally and `action` runs on click — exactly the
// contract the gating decision tree depends on.
vi.mock('@openpeepshq/react-ui', async () => {
  const React = await import('react');
  const Item = (props: {
    text?: string;
    title?: string;
    action?: () => void;
    icon?: unknown;
  }) =>
    React.createElement(
      'button',
      {
        type: 'button',
        onClick: typeof props.action === 'function' ? props.action : undefined,
      },
      props.text ?? props.title,
    );
  return {
    PopupMenu: (props: { children?: React.ReactNode; menuButton?: unknown }) =>
      React.createElement(
        'div',
        null,
        React.createElement('button', { type: 'button' }),
        props.children,
      ),
    PopupMenuButton: Item,
    PopupSection: (props: { title: string }) =>
      React.createElement('div', null, props.title),
    PopupSeparator: () => React.createElement('hr'),
    Dialog: (props: { open: boolean; children?: React.ReactNode }) =>
      props.open ? React.createElement('div', null, props.children) : null,
    DialogContent: (props: { children?: React.ReactNode }) =>
      React.createElement('div', null, props.children),
    DialogHeader: (props: { children?: React.ReactNode }) =>
      React.createElement('div', null, props.children),
    DialogTitle: (props: { children?: React.ReactNode }) =>
      React.createElement('div', null, props.children),
    DialogActions: (props: {
      actionLabel?: string;
      onAction?: () => void;
      children?: React.ReactNode;
    }) =>
      React.createElement(
        'div',
        null,
        props.children,
        props.onAction
          ? React.createElement(
              'button',
              { type: 'button', onClick: props.onAction },
              props.actionLabel,
            )
          : null,
      ),
  };
});

const PUBLIC_POST = { id: 'post-1', visibility: 'public' } as never;
const PRIVATE_POST = { id: 'post-2', visibility: 'private' } as never;

describe('ShareMenu', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state.signedIn = true;
    state.toasts = [];
    state.calls = [];
    state.pickerProps = {
      group: {},
      conversation: {},
    };
    state.postableGroupIds = new Set();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = (post: typeof PUBLIC_POST) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(ShareMenu, { post }));
    });
    return container;
  };

  const click = async (element: Element) => {
    await act(async () => {
      element.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });
  };

  it('shows external share items for a public post', () => {
    render(PUBLIC_POST);
    const html = container!.innerHTML;
    // jsdom has no navigator.share, so only the copy-link path is offered.
    expect(html).not.toContain('Share via…');
    expect(html).toContain('Copy link');
    expect(html).toContain('Other options');
  });

  it('hides external share items for a private post but keeps repost and send-in-message', () => {
    render(PRIVATE_POST);
    const html = container!.innerHTML;
    expect(html).not.toContain('Share via…');
    expect(html).not.toContain('Copy link');
    expect(html).toContain('Repost');
    expect(html).toContain('Send in message');
    // Group sharing stays gated on public sources on both platforms (the
    // server drops the source audience on group-targeted reposts, so a
    // private→group share would 403); DM-thread sharing remains available.
    expect(html).not.toContain('Share into group…');
    expect(html).toContain('Send to conversation…');
    // No orphaned "Other options" header with nothing beneath it.
    expect(html).not.toContain('Other options');
  });

  it('opens the copy-link dialog on the no-share-API path', async () => {
    render(PUBLIC_POST);
    const copyButton = [...container!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Copy link'),
    );
    expect(copyButton).toBeTruthy();
    await click(copyButton!);
    expect(container!.innerHTML).toContain('Share post link');
  });

  it('toasts an error when the system share rejects for a non-abort reason', async () => {
    vi.stubGlobal(
      'navigator',
      Object.assign(Object.create(Object.getPrototypeOf(navigator)), {
        share: vi
          .fn()
          .mockRejectedValue(new DOMException('denied', 'NotAllowedError')),
      }),
    );
    render(PUBLIC_POST);
    const shareButton = [...container!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Share via…'),
    );
    await click(shareButton!);
    expect(state.toasts.some((t) => t.type === 'error')).toBe(true);
    vi.unstubAllGlobals();
  });

  it('signed-out viewer of a public post sees only the copy-link path (#306 round 5 S4)', () => {
    state.signedIn = false;
    render(PUBLIC_POST);
    const html = container!.innerHTML;
    expect(html).toContain('Copy link');
    // No in-community section and no orphaned "Other options" header.
    expect(html).not.toContain('Share on community');
    expect(html).not.toContain('Repost');
    expect(html).not.toContain('Send in message');
    expect(html).not.toContain('Other options');
  });

  it('hides the whole Share menu for a signed-out viewer of a non-public post (#306 round 5 S1)', () => {
    state.signedIn = false;
    render(PRIVATE_POST);
    // The affordance is removed entirely rather than opening an empty
    // dropdown: no button, no menu.
    expect(container!.innerHTML).toBe('');
  });

  it('shows the new in-community targets for a signed-in viewer (#1851)', () => {
    render(PUBLIC_POST);
    const html = container!.innerHTML;
    expect(html).toContain('Share into group…');
    expect(html).toContain('Send to conversation…');
  });

  it('hides the new in-community targets for a signed-out viewer (#1851)', () => {
    state.signedIn = false;
    render(PUBLIC_POST);
    const html = container!.innerHTML;
    expect(html).not.toContain('Share into group…');
    expect(html).not.toContain('Send to conversation…');
  });

  it('tapping "Share into group…" opens the group picker, and sharing into a group calls shareIntoGroup (#1851)', async () => {
    render(PUBLIC_POST);
    const openButton = [...container!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Share into group…'),
    );
    expect(openButton).toBeTruthy();
    expect(
      container!.querySelector('[data-testid="group-picker-select"]'),
    ).toBeNull();
    await click(openButton!);
    // Picker opens wired to the share action.
    const select = container!.querySelector(
      '[data-testid="group-picker-select"]',
    );
    expect(select).toBeTruthy();
    await click(select!);
    expect(state.calls).toContain('shareIntoGroup:group-1');
  });

  it('tapping "Send to conversation…" opens the conversation picker, and sending calls sendToConversation (#1851)', async () => {
    state.openpeepsApi = {
      useConversations: () => ({
        data: [[{ id: 'conv-root', audience: [{ id: 'other-1' }] }]],
        isLoading: false,
      }),
    };
    render(PUBLIC_POST);
    const openButton = [...container!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Send to conversation…'),
    );
    expect(openButton).toBeTruthy();
    await click(openButton!);
    const send = container!.querySelector(
      '[data-testid="conversation-picker-send"]',
    );
    expect(send).toBeTruthy();
    await click(send!);
    expect(state.calls).toContain('sendToConversation:1');
  });
});
