/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// The menu-level tests mock these pickers; here we exercise the real
// pickers to cover the capability filter (group picker) and the
// conversation preview rendering (conversation picker).
vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: Record<string, unknown>) => {
    const template = opts?.defaultValue as string | undefined;
    if (!template) return key;
    // Interpolate `{{var}}` tokens the way the real i18n runtime does.
    return template.replace(/{{\s*(\w+)\s*}}/g, (_m, v: string) =>
      String(opts?.[v] ?? ''),
    );
  },
}));

const state = {
  me: undefined as unknown as {
    id: string;
    memberships: {
      group: { id: string; handle: string; displayName?: string };
    }[];
  } | null,
  authData: {},
  postableGroupIds: new Set<string>(),
  conversations: [] as unknown[][],
  isLoading: false,
  toasts: [] as { type: string; message: string }[],
};

vi.mock('../../layout/IdentityContext', () => ({
  useCurrentProfile: () => state.me,
  useAuthData: () => state.authData,
}));

vi.mock('../../layout/ToastProvider', () => ({
  useToast: () => ({
    success: (message: string) =>
      state.toasts.push({ type: 'success', message }),
    error: (message: string) => state.toasts.push({ type: 'error', message }),
  }),
}));

vi.mock('../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useConversations: () => ({
        data: state.conversations,
        isLoading: state.isLoading,
      }),
    },
  }),
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

// Mock-downgrade (review round 7 S2): the real `@openpeepshq/react-ui` Dialog
// (Radix) mounts its content in a portal once opened, which jsdom can't drive,
// so the shell is reduced to a plain `div`. The picker *logic* (capability
// filter, conversation preview, `onShare`/`onSend` wiring, toasts) is still
// the real component; only the Radix presentation is stubbed. The full
// ShareMenu → picker → hook wiring is covered by shareMenuWiring.test.tsx.
vi.mock('@openpeepshq/react-ui', async () => {
  const React = await import('react');
  return {
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
    LoadingSpinner: () =>
      React.createElement('div', { 'data-testid': 'spinner' }),
  };
});

import { ShareIntoGroupPicker } from './ShareIntoGroupPicker';
import { SendToConversationPicker } from './SendToConversationPicker';

const group = (id: string, handle: string, displayName?: string) =>
  ({ id, handle, displayName }) as never;

describe('ShareIntoGroupPicker', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state.toasts = [];
    state.me = {
      id: 'me-1',
      memberships: [
        { group: group('group-1', 'exec', 'Executive') },
        { group: group('group-2', 'readonly', 'Read Only') },
      ],
    };
    state.postableGroupIds = new Set(['group-1']);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onShare: (groupId: string) => Promise<void>;
  }) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(ShareIntoGroupPicker, props));
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

  it('lists only groups the member can post notes to', () => {
    render({ open: true, onOpenChange: () => {}, onShare: async () => {} });
    const html = container!.innerHTML;
    expect(html).toContain('Executive');
    expect(html).toContain('@exec');
    // group-2 fails the capability check and must not be listed.
    expect(html).not.toContain('Read Only');
    expect(html).not.toContain('@readonly');
  });

  it('shows the empty state when no group is postable', () => {
    state.postableGroupIds = new Set();
    render({ open: true, onOpenChange: () => {}, onShare: async () => {} });
    expect(container!.innerHTML).toContain("You can't post to any group");
  });

  it('shares into the selected group, toasts success, and closes', async () => {
    const onOpenChange = vi.fn();
    const onShare = vi.fn(async () => {});
    render({ open: true, onOpenChange, onShare });
    const button = [...container!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Executive'),
    );
    await click(button!);
    expect(onShare).toHaveBeenCalledWith('group-1');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Success toast names the group (sharedIntoGroup key).
    expect(
      state.toasts.some(
        (t) => t.type === 'success' && t.message.includes('Executive'),
      ),
    ).toBe(true);
  });

  it('toasts the share error and keeps the dialog open when the share fails', async () => {
    const onOpenChange = vi.fn();
    const onShare = vi.fn(async () => {
      throw new Error('forbidden');
    });
    render({ open: true, onOpenChange, onShare });
    const button = [...container!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Executive'),
    );
    await click(button!);
    expect(onShare).toHaveBeenCalledWith('group-1');
    // No success toast, a shareFailed error toast, and the dialog stays open.
    expect(state.toasts.some((t) => t.type === 'success')).toBe(false);
    expect(
      state.toasts.some(
        (t) => t.type === 'error' && t.message === "Couldn't share the post",
      ),
    ).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(container!.innerHTML).toContain('Share into group');
  });

  // Web twin of the RN in-flight pin (round 9 S2, mirrored per round 10 S2):
  // drive `onShare` with a promise the test resolves manually so the
  // in-flight window can be observed — every row is disabled while
  // `sharing !== null`, and a second click inside the window is swallowed by
  // the `if (sharing) return` statement guard (not by the `disabled`
  // attribute), so the shared guard semantics are pinned per side.
  it('in-flight: rows are disabled and a second press is swallowed by the guard, then rows re-enable after settle (round 10 S2)', async () => {
    let resolveShare: (v: undefined) => void = () => {};
    const onShare = vi.fn(
      () =>
        new Promise<undefined>((resolve) => {
          resolveShare = resolve;
        }),
    );
    render({ open: true, onOpenChange: () => {}, onShare });
    const button = [...container!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Executive'),
    );
    // First click starts the share.
    await click(button!);
    expect(onShare).toHaveBeenCalledTimes(1);
    // In-flight: every row is disabled.
    const allButtons = [...container!.querySelectorAll('button')];
    expect(allButtons.length).toBeGreaterThan(0);
    expect(allButtons.every((b) => b.disabled)).toBe(true);
    // A second click during the window is swallowed by the statement guard.
    await click(button!);
    expect(onShare).toHaveBeenCalledTimes(1);
    // Settling the share re-enables the rows.
    await act(async () => {
      resolveShare(undefined);
      await Promise.resolve();
    });
    expect(
      [...container!.querySelectorAll('button')].every((b) => b.disabled),
    ).toBe(false);
    expect(
      state.toasts.some(
        (t) => t.type === 'success' && t.message.includes('Executive'),
      ),
    ).toBe(true);
  });
});

describe('SendToConversationPicker', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state.toasts = [];
    state.me = { id: 'me-1', memberships: [] };
    state.isLoading = false;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSend: (conversation: unknown[]) => Promise<void>;
  }) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(SendToConversationPicker, props));
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

  it('lists conversations by the other participant and sends to the selected one', async () => {
    state.conversations = [
      [
        {
          id: 'root-1',
          audience: [
            { id: 'me-1' },
            { id: 'other-1', displayName: 'Ada', handle: 'ada' },
          ],
          data: { type: 'note', content: 'hello' },
          profile: { id: 'other-1', handle: 'ada' },
        },
      ],
    ];
    const onSend = vi.fn(async () => {});
    render({ open: true, onOpenChange: () => {}, onSend });
    const html = container!.innerHTML;
    expect(html).toContain('Ada');
    const button = [...container!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ada'),
    );
    await click(button!);
    // The whole conversation array is passed to the send action.
    expect(onSend).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'root-1' })]),
    );
  });

  it('shows the empty state when there are no conversations', () => {
    state.conversations = [];
    render({ open: true, onOpenChange: () => {}, onSend: async () => {} });
    expect(container!.innerHTML).toContain(
      "You don't have any conversations yet",
    );
  });

  it('sends to the selected conversation, toasts success, and closes', async () => {
    state.conversations = [
      [
        {
          id: 'root-1',
          audience: [
            { id: 'me-1' },
            { id: 'other-1', displayName: 'Ada', handle: 'ada' },
          ],
          data: { type: 'note', content: 'hello' },
          profile: { id: 'other-1', handle: 'ada' },
        },
      ],
    ];
    const onOpenChange = vi.fn();
    const onSend = vi.fn(async () => {});
    render({ open: true, onOpenChange, onSend });
    const button = [...container!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ada'),
    );
    await click(button!);
    expect(onSend).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Success toast names the other participant (sentToConversation key).
    expect(
      state.toasts.some(
        (t) => t.type === 'success' && t.message.includes('Ada'),
      ),
    ).toBe(true);
  });

  it('toasts the share error and keeps the dialog open when the send fails', async () => {
    state.conversations = [
      [
        {
          id: 'root-1',
          audience: [
            { id: 'me-1' },
            { id: 'other-1', displayName: 'Ada', handle: 'ada' },
          ],
          data: { type: 'note', content: 'hello' },
          profile: { id: 'other-1', handle: 'ada' },
        },
      ],
    ];
    const onOpenChange = vi.fn();
    const onSend = vi.fn(async () => {
      throw new Error('forbidden');
    });
    render({ open: true, onOpenChange, onSend });
    const button = [...container!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ada'),
    );
    await click(button!);
    // No success toast, a shareFailed error toast, and the dialog stays open.
    expect(state.toasts.some((t) => t.type === 'success')).toBe(false);
    expect(
      state.toasts.some(
        (t) => t.type === 'error' && t.message === "Couldn't share the post",
      ),
    ).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(container!.innerHTML).toContain('Send to conversation');
  });

  // Web twin of the RN in-flight pin (round 9 S2, mirrored per round 10 S2):
  // drive `onSend` with a promise the test resolves manually so the
  // in-flight window can be observed — every row is disabled while
  // `sending !== null`, and a second click inside the window is swallowed by
  // the `if (!root || sending) return` statement guard (not by the `disabled`
  // attribute), so the shared guard semantics are pinned per side.
  it('in-flight: rows are disabled and a second press is swallowed by the guard, then rows re-enable after settle (round 10 S2)', async () => {
    state.conversations = [
      [
        {
          id: 'root-1',
          audience: [
            { id: 'me-1' },
            { id: 'other-1', displayName: 'Ada', handle: 'ada' },
          ],
          data: { type: 'note', content: 'hello' },
          profile: { id: 'other-1', handle: 'ada' },
        },
      ],
    ];
    let resolveSend: (v: undefined) => void = () => {};
    const onSend = vi.fn(
      () =>
        new Promise<undefined>((resolve) => {
          resolveSend = resolve;
        }),
    );
    render({ open: true, onOpenChange: () => {}, onSend });
    const button = [...container!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ada'),
    );
    // First click starts the send.
    await click(button!);
    expect(onSend).toHaveBeenCalledTimes(1);
    // In-flight: every row is disabled.
    const allButtons = [...container!.querySelectorAll('button')];
    expect(allButtons.length).toBeGreaterThan(0);
    expect(allButtons.every((b) => b.disabled)).toBe(true);
    // A second click during the window is swallowed by the statement guard.
    await click(button!);
    expect(onSend).toHaveBeenCalledTimes(1);
    // Settling the send re-enables the rows.
    await act(async () => {
      resolveSend(undefined);
      await Promise.resolve();
    });
    expect(
      [...container!.querySelectorAll('button')].every((b) => b.disabled),
    ).toBe(false);
    expect(
      state.toasts.some(
        (t) => t.type === 'success' && t.message.includes('Ada'),
      ),
    ).toBe(true);
  });

  it('labels a thread with the root participant when the last post no longer names anyone but the viewer', () => {
    // The other participant left (or the thread is a note-to-self follow-up):
    // the last post's audience is just the viewer, but the root post still
    // names the original partner, so the row must not read "You".
    state.conversations = [
      [
        {
          id: 'root-1',
          audience: [
            { id: 'me-1' },
            { id: 'other-1', displayName: 'Ada', handle: 'ada' },
          ],
          data: { type: 'note', content: 'hello' },
          profile: { id: 'other-1', handle: 'ada' },
        },
        {
          id: 'last-1',
          audience: [{ id: 'me-1' }],
          data: { type: 'note', content: 'note to self' },
          profile: { id: 'me-1', handle: 'me' },
        },
      ],
    ];
    render({ open: true, onOpenChange: () => {}, onSend: async () => {} });
    const html = container!.innerHTML;
    expect(html).toContain('Ada');
    expect(html).not.toContain('>You<');
  });

  it('falls back to "You" only when neither last nor root post names anyone else', () => {
    state.conversations = [
      [
        {
          id: 'root-1',
          audience: [{ id: 'me-1' }],
          data: { type: 'note', content: 'hello me' },
          profile: { id: 'me-1', handle: 'me' },
        },
      ],
    ];
    render({ open: true, onOpenChange: () => {}, onSend: async () => {} });
    expect(container!.innerHTML).toContain('>You<');
  });
});

// Review round 7 S3: the pickers' transient `sharing`/`sending` state is
// local-only and can't survive a re-open. ShareMenu mounts each picker
// conditionally (`{open ? <Picker/> : null}`), so closing the picker unmounts
// it and discards its state — no stale selection can leak across opens. Pin
// the contract in the source (mirrors the RN-side pin) so a later refactor
// can't keep a picker mounted across open/close without re-proving the reset.
describe('picker mounting contract (issue #1851 round 7 S3)', () => {
  it('ShareMenu mounts the pickers conditionally, so their transient state is discarded on close', () => {
    const src = fs.readFileSync(path.join(__dirname, 'ShareMenu.tsx'), 'utf8');
    // The pickers render only while their open flag is true; closing the
    // picker unmounts it (and thus clears `sharing`/`sending`).
    expect(src).toMatch(/groupPickerOpen\s*\?\s*\(\s*<ShareIntoGroupPicker/);
    expect(src).toMatch(
      /conversationPickerOpen\s*\?\s*\(\s*<SendToConversationPicker/,
    );
  });
});
