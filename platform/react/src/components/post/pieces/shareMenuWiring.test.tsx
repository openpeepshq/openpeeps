/** @vitest-environment jsdom */
/**
 * Share-menu → picker → shared-hook wiring smoke test (issue #1851, review
 * round 7 S1/S2).
 *
 * `ShareMenu.test.tsx` stubs `useShareMenu` and both pickers so it can pin the
 * menu's gating decision tree; `sharePickers.test.tsx` mounts the pickers in
 * isolation. Neither exercises the full chain, so this test renders the REAL
 * `ShareMenu`, the REAL `ShareIntoGroupPicker`/`SendToConversationPicker`, and
 * the REAL `useShareMenu` hook together, with only the Radix shell downgraded
 * (the real `PopupMenu`/`Dialog` mount their content in a portal once opened,
 * which jsdom cannot drive — the same mock-downgrade the other two files
 * document). That lets the smoke test assert the wiring that matters:
 *   - the group/conversation pickers mount only through the real menu,
 *   - `onShare`/`onSend` are the real hook functions (not stubs), so a send
 *     carries the shared-hook's link + 200-char excerpt budget on BOTH web and
 *     native (parity is by construction — the excerpt is built in the shared
 *     `useShareMenu`, never in a platform-specific copy), and
 *   - the group picker's capability filter is the real `checkGroupCapabilities`
 *     path.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const state = {
  me: { id: 'me-1' } as Record<string, unknown>,
  authData: {} as Record<string, unknown>,
  postableGroupIds: new Set<string>(),
  conversations: [] as unknown[][],
  isLoading: false,
  toasts: [] as { type: string; message: string }[],
};

const mockCreatePost = vi.fn();
/** the mutation fn a `createConversationPostAction({ id })` returns */
const mockCreateConversationPostFn = vi.fn();

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: Record<string, unknown>) => {
    const template = opts?.defaultValue as string | undefined;
    if (!template) return key;
    return template.replace(/{{\s*(\w+)\s*}}/g, (_m, v: string) =>
      String(opts?.[v] ?? ''),
    );
  },
}));

vi.mock('../../conversations/CreateNewConversationContext', () => ({
  useCreateNewConversation: () => ({ openCreateConversation: vi.fn() }),
}));

vi.mock('../../layout/ToastProvider', () => ({
  useToast: () => ({
    success: (message: string) =>
      state.toasts.push({ type: 'success', message }),
    error: (message: string) => state.toasts.push({ type: 'error', message }),
  }),
}));

vi.mock('../../layout/IdentityContext', () => ({
  useCurrentProfile: () => state.me,
  useAuthData: () => state.authData,
}));

vi.mock('../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      repostPostAction: () => vi.fn(),
      createPostAction: () => mockCreatePost,
      createConversationPostAction: () => mockCreateConversationPostFn,
      useConversations: () => ({
        data: state.conversations,
        isLoading: state.isLoading,
      }),
    },
  }),
}));

// Real `checkGroupCapabilities`/`isPubliclyShareable`; only the capability
// outcome is driven per test so the picker's real filter branch is exercised.
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

// Radix shell downgrade only: static menu (items always rendered, `action`
// runs on click) and plain-`div` dialog. The picker *components* themselves
// are NOT mocked — this is the point of the test.
vi.mock('@openpeepshq/react-ui', async () => {
  const React = await import('react');
  const Item = (props: {
    text?: string;
    title?: string;
    action?: () => void;
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
    PopupMenu: (props: {
      children?: React.ReactNode;
      menuButton?: React.ReactNode;
    }) => React.createElement('div', null, props.children),
    PopupMenuButton: Item,
    PopupSection: (props: { title: string }) =>
      React.createElement('div', null, props.title),
    PopupSeparator: () => React.createElement('hr'),
    Dialog: (props: { open: boolean; children?: React.ReactNode }) =>
      props.open
        ? React.createElement(
            'div',
            { 'data-testid': 'dialog' },
            props.children,
          )
        : null,
    DialogContent: (props: { children?: React.ReactNode }) =>
      React.createElement('div', null, props.children),
    DialogHeader: (props: { children?: React.ReactNode }) =>
      React.createElement('div', null, props.children),
    DialogTitle: (props: { children?: React.ReactNode }) =>
      React.createElement('h2', null, props.children),
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
    LoadingSpinner: () =>
      React.createElement('div', { 'data-testid': 'spinner' }),
  };
});

import { ShareMenu } from './ShareMenu';

const group = (id: string, handle: string, displayName?: string) =>
  ({ id, handle, displayName }) as never;

const PUBLIC_POST = {
  id: 'post-1',
  type: 'note',
  visibility: 'public',
  profile: { id: 'author' },
  data: { type: 'note', content: 'Hello world' },
} as never;

describe('ShareMenu → picker → shared-hook wiring (issue #1851 round 7)', () => {
  let root: Root;
  let container: HTMLDivElement;
  // jsdom default origin; the hook builds the post link from `window.location.origin`.
  const origin = 'http://localhost:3000';

  beforeAll(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  beforeEach(() => {
    mockCreatePost.mockReset();
    mockCreateConversationPostFn.mockReset();
    state.toasts = [];
    state.postableGroupIds = new Set();
    state.conversations = [];
    state.isLoading = false;
    state.me = {
      id: 'me-1',
      memberships: [
        { group: group('group-1', 'exec', 'Executive') },
        { group: group('group-2', 'readonly', 'Read Only') },
      ],
    };
  });

  afterEach(() => {
    act(() => {
      root.render(null);
    });
    container.innerHTML = '';
  });

  const render = () => {
    act(() => {
      root.render(createElement(ShareMenu, { post: PUBLIC_POST }));
    });
  };

  const click = async (element: Element) => {
    await act(async () => {
      element.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });
  };

  const menuButton = (label: string) =>
    [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes(label),
    );

  it('shares into a group via the real picker + real hook: capability filter + link note (no repost)', async () => {
    state.postableGroupIds = new Set(['group-1']);
    render();
    await click(menuButton('Share into group…')!);

    // The REAL group picker mounted (real Dialog stub): only the postable group
    // is listed — the real capability-filter branch runs, Read Only is dropped.
    expect(container.innerHTML).toContain('Executive');
    expect(container.innerHTML).not.toContain('Read Only');

    // Selecting the group calls the REAL hook's shareIntoGroup (createPost, not
    // the repost mutation) with a plain link note.
    await click(
      [...container.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Executive'),
      )!,
    );
    expect(mockCreatePost).toHaveBeenCalledWith({
      visibility: 'group',
      type: 'note',
      groupId: 'group-1',
      data: { type: 'note', content: `${origin}/posts/post-1` },
    });
  });

  it('sends to a conversation via the real picker + real hook: link + excerpt (shared budget)', async () => {
    state.conversations = [
      [
        { id: 'root-1', audience: [{ id: 'other-1', handle: 'ada' }] },
        {
          id: 'last-1',
          audience: [{ id: 'other-1', handle: 'ada' }],
          data: { type: 'note', content: 'hi' },
        },
      ],
    ];
    render();
    await click(menuButton('Send to conversation…')!);

    // The REAL conversation picker mounted: the thread is listed by the other
    // participant (self excluded from the title).
    expect(container.innerHTML).toContain('@ada');

    // Selecting it calls the REAL hook's sendToConversation — a link note plus
    // the shared-hook excerpt for this publicly shareable post (parity: native
    // sends through this same hook function).
    await click(
      [...container.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('@ada'),
      )!,
    );
    expect(mockCreateConversationPostFn).toHaveBeenCalledWith({
      visibility: 'direct',
      type: 'note',
      data: {
        type: 'note',
        content: `${origin}/posts/post-1\nHello world`,
      },
    });
  });

  it('keeps the menu closed until an item opens a picker (real pickers, not always-mounted)', () => {
    render();
    // No dialog is open until the user opens a picker.
    expect(container.querySelector('[data-testid="dialog"]')).toBeNull();
    // The two new items are present for a signed-in viewer.
    expect(menuButton('Share into group…')).toBeTruthy();
    expect(menuButton('Send to conversation…')).toBeTruthy();
  });

  // Review round 9 S1: the seam "real hook → real picker → error toast" was
  // only covered on the success path (and on the RN side). These cases make
  // the real mutations reject and assert the shared failure surface: no
  // success toast, the `shareFailed` error toast, and the dialog stays open.
  it('a rejecting shareIntoGroup surfaces the error toast, no success toast, dialog stays open (round 9 S1)', async () => {
    state.postableGroupIds = new Set(['group-1']);
    mockCreatePost.mockRejectedValue(new Error('boom'));
    render();
    await click(menuButton('Share into group…')!);
    await click(
      [...container.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Executive'),
      )!,
    );
    // The real picker's catch → error toast; the success toast never fires.
    expect(state.toasts).toEqual([
      { type: 'error', message: "Couldn't share the post" },
    ]);
    // The dialog is still open (the row re-enables for another attempt).
    expect(container.querySelector('[data-testid="dialog"]')).not.toBeNull();
    expect(mockCreatePost).toHaveBeenCalledTimes(1);
  });

  it('a rejecting sendToConversation surfaces the error toast, no success toast, dialog stays open (round 9 S1)', async () => {
    state.conversations = [
      [
        { id: 'root-1', audience: [{ id: 'other-1', handle: 'ada' }] },
        {
          id: 'last-1',
          audience: [{ id: 'other-1', handle: 'ada' }],
          data: { type: 'note', content: 'hi' },
        },
      ],
    ];
    mockCreateConversationPostFn.mockRejectedValue(new Error('boom'));
    render();
    await click(menuButton('Send to conversation…')!);
    await click(
      [...container.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('@ada'),
      )!,
    );
    expect(state.toasts).toEqual([
      { type: 'error', message: "Couldn't share the post" },
    ]);
    expect(container.querySelector('[data-testid="dialog"]')).not.toBeNull();
    expect(mockCreateConversationPostFn).toHaveBeenCalledTimes(1);
  });
});
