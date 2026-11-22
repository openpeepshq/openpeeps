/**
 * Share-into-group / send-to-conversation modal behavior (issue #1851, review
 * round 7 S2).
 *
 * The ShareMenu tests pin that tapping the two new items *opens* these modals;
 * these tests exercise the modals' own behavior that was previously only
 * smoke-tested: the group list is filtered by the `core-posts-create-note`
 * capability, the conversation list loads from `useConversations()`, and the
 * `onShare` / `onSend` callbacks fire with the chosen target and drive the
 * success/error toasts plus close.
 *
 * Mirrors the inline-mock pattern of ShareMenu.test.tsx: node jest env, every
 * external import mocked, and the common/lib capability predicate mirrored
 * inline (its real semantics are exhaustively unit-tested in platform/common).
 *
 * Mock-downgrade (review round 7 S2): the real `BaseSheet` renders a
 * `@gorhom/bottom-sheet` sheet driven by `react-native-gesture-handler`,
 * whose native modules are unavailable in the node jest env. It is therefore
 * mocked to a plain pass-through (as is `use-controlled-sheet`), so these
 * tests exercise the modal's *logic* — the capability/conversation filters,
 * the `onShare`/`onSend` wiring, the in-flight guard, and the toasts — but
 * not the bottom-sheet presentation itself. The sheet presentation is
 * covered by the native app's own UI.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import Toast from 'react-native-toast-message';
import fs from 'node:fs';
import path from 'node:path';

const state = {
  me: null as unknown,
  authData: {} as Record<string, unknown>,
  conversations: [] as unknown[],
  conversationsLoading: false,
};

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string; name?: string }) =>
      opts?.defaultValue?.replace(/\{\{name\}\}/g, opts.name ?? '') ?? key,
  }),
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

// Mirrors the real predicate closely enough to prove the modal's filter runs
// against the membership role (the real scope/role merge is covered in
// platform/common). `authData.profile.memberships[].roles` × `group.capabilities`
// is the only thing this path reads.
jest.mock('@openpeepshq/common/lib', () => ({
  checkGroupCapabilities: (
    authData: {
      profile?: {
        memberships?: { group: { id: string }; roles: string[] }[];
      } | null;
    },
    needed: string[],
    group: { id: string; capabilities?: Record<string, { add: string[] }> }
  ) => {
    const roles =
      authData.profile?.memberships?.find((m) => m.group.id === group.id)
        ?.roles ?? [];
    const add = roles.flatMap((r) => group.capabilities?.[r]?.add ?? []);
    const ok = needed.every((c) => add.includes(c));
    return { success: ok, missingCapabilities: ok ? [] : needed };
  },
  truncateText: (
    text?: string | null,
    maxLength: number = 15
  ): string | undefined => {
    const t = (text ?? '').trim();
    return t.length > maxLength ? `${t.slice(0, maxLength - 1)}…` : t;
  },
}));

jest.mock('@openpeepshq/react', () => {
  // Load the *real* `conversationTitle` so the modal runs against the single
  // shared implementation instead of a mirror that can drift (its full
  // semantics are unit-tested against the real code in platform/react). The
  // module's only import is a type (`@openpeepshq/common/types`), elided by
  // ts-jest, so it has no runtime deps to pull into the node jest env. The
  // hooks/providers around it stay mocked below.
  const {
    conversationTitle,
  } = require('../../../../../react/src/hooks/conversations/conversationTitle');
  return {
    conversationTitle,
    useCurrentProfile: () => state.me,
    useAuthData: () => state.authData,
    useOpenpeeps: () => ({
      openpeepsApi: {
        useConversations: () => ({
          data: state.conversations,
          isLoading: state.conversationsLoading,
        }),
      },
    }),
  };
});

jest.mock('../../../hooks/use-controlled-sheet', () => ({
  useControlledSheet: () => ({ current: null }),
}));

jest.mock('../../custom/modals/common', () => {
  const React = require('react');
  return {
    // The real BaseSheet renders its children unconditionally; presentation
    // is driven by the (mocked) useControlledSheet, so the mock does the same.
    BaseSheet: (props: { children?: unknown }) =>
      React.createElement('BaseSheet', null, props.children),
  };
});

jest.mock('../../ui/themed-text', () => {
  const React = require('react');
  return {
    ThemedText: (props: { children?: unknown }) =>
      React.createElement('ThemedText', null, props.children),
  };
});

jest.mock('../../ui/loading-spinner', () => ({
  LoadingSpinner: () => null,
}));

jest.mock('../../ui/button', () => {
  const React = require('react');
  return {
    // The real Button forwards the pressable props; mirror it so tests can
    // reach `onPress` on the rendered node.
    Button: (props: Record<string, unknown>) =>
      React.createElement('View', props, props.children),
  };
});

import { ShareIntoGroupModal } from './modals/ShareIntoGroupModal';
import { SendToConversationModal } from './modals/SendToConversationModal';

type TreeNode = {
  type?: string;
  props?: Record<string, unknown> | null;
  children?: (TreeNode | string | null)[];
};

function collectText(node: unknown, out: string[] = []): string[] {
  if (node === null || typeof node !== 'object') return out;
  const nodes = Array.isArray(node) ? node : [node];
  for (const entry of nodes) {
    if (typeof entry === 'string') {
      out.push(entry);
      continue;
    }
    if (!entry) continue;
    const n = entry as TreeNode;
    for (const c of n.children || []) {
      if (typeof c === 'string') out.push(c);
      else if (c) collectText(c, out);
    }
  }
  return out;
}

/**
 * Find the string `text` in the tree, then walk up to the nearest ancestor
 * carrying an `onPress` (the mocked Button) and invoke it.
 */
function pressByText(json: unknown, text: string): void {
  const visit = (node: unknown, path: unknown[]): void => {
    if (typeof node === 'string') {
      if (node === text) {
        for (let i = path.length - 1; i >= 0; i--) {
          const ancestor = path[i] as TreeNode;
          if (typeof ancestor?.props?.onPress === 'function') {
            (ancestor.props.onPress as () => void)();
            return;
          }
        }
      }
      return;
    }
    if (node === null || typeof node !== 'object') return;
    const children = (node as TreeNode).children;
    if (!Array.isArray(children)) return;
    for (const c of children) visit(c, [...path, node]);
  };
  visit(json, []);
}

const GROUP_YES = {
  id: 'g-yes',
  handle: 'yes',
  displayName: 'Yes Group',
  capabilities: { member: { add: ['core-posts-create-note'] } },
};
const GROUP_NO = {
  id: 'g-no',
  handle: 'no',
  displayName: 'No Group',
  capabilities: { member: { add: [] } },
};

beforeEach(() => {
  // react-test-renderer's act() needs this to skip the "not configured" warning.
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  state.me = null;
  state.authData = {};
  state.conversations = [];
  state.conversationsLoading = false;
  (Toast.show as jest.Mock).mockClear();
});

// ---------- ShareIntoGroupModal ----------

test('group modal lists only groups the viewer can post notes to (#1851 S4)', () => {
  state.me = {
    id: 'me-1',
    memberships: [
      { group: GROUP_YES, roles: ['member'] },
      { group: GROUP_NO, roles: ['member'] },
    ],
  };
  state.authData = {
    profile: {
      id: 'me-1',
      memberships: [
        { group: { id: 'g-yes' }, roles: ['member'] },
        { group: { id: 'g-no' }, roles: ['member'] },
      ],
    },
  };
  const onShare = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ShareIntoGroupModal, {
        open: true,
        onClose: jest.fn(),
        onShare,
      })
    );
  });
  const text = collectText(tree.toJSON());
  expect(text).toContain('Yes Group');
  expect(text).not.toContain('No Group');
  tree.unmount();
});

test('group modal shows the empty state when no group is postable (#1851 S4)', () => {
  state.me = {
    id: 'me-1',
    memberships: [{ group: GROUP_NO, roles: ['member'] }],
  };
  state.authData = {
    profile: {
      id: 'me-1',
      memberships: [{ group: { id: 'g-no' }, roles: ['member'] }],
    },
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ShareIntoGroupModal, {
        open: true,
        onClose: jest.fn(),
        onShare: jest.fn(),
      })
    );
  });
  expect(collectText(tree.toJSON())).toContain("You can't post to any group");
  tree.unmount();
});

test('group modal: sharing calls onShare with the group id, toasts success, closes (#1851 S4)', async () => {
  state.me = {
    id: 'me-1',
    memberships: [{ group: GROUP_YES, roles: ['member'] }],
  };
  state.authData = {
    profile: {
      id: 'me-1',
      memberships: [{ group: { id: 'g-yes' }, roles: ['member'] }],
    },
  };
  const onShare = jest.fn().mockResolvedValue(undefined);
  const onClose = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ShareIntoGroupModal, {
        open: true,
        onClose,
        onShare,
      })
    );
  });
  await ReactTestRenderer.act(async () => {
    pressByText(tree.toJSON(), 'Yes Group');
  });
  expect(onShare).toHaveBeenCalledWith('g-yes');
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'success', text1: 'Shared into Yes Group' })
  );
  expect(onClose).toHaveBeenCalled();
  tree.unmount();
});

test('group modal: a failed share toasts the error and keeps the sheet open (#1851 S4)', async () => {
  state.me = {
    id: 'me-1',
    memberships: [{ group: GROUP_YES, roles: ['member'] }],
  };
  state.authData = {
    profile: {
      id: 'me-1',
      memberships: [{ group: { id: 'g-yes' }, roles: ['member'] }],
    },
  };
  const onShare = jest.fn().mockRejectedValue(new Error('boom'));
  const onClose = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ShareIntoGroupModal, {
        open: true,
        onClose,
        onShare,
      })
    );
  });
  await ReactTestRenderer.act(async () => {
    pressByText(tree.toJSON(), 'Yes Group');
  });
  expect(onShare).toHaveBeenCalledWith('g-yes');
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'error',
      text1: "Couldn't share the post",
    })
  );
  expect(onClose).not.toHaveBeenCalled();
  tree.unmount();
});

// Review round 11 S2: the conversation modal pins its in-flight window (round
// 9 S2) and its failed-send guard reset (round 7 S3); the group modal only
// asserted settled outcomes. Mirror both onto `ShareIntoGroupModal` so the two
// new modals pin the same guard semantics — `sharing` disables the row in
// flight, a second press is swallowed by the guard, and `finally` re-enables
// the row after a failure. This is the RN twin of the statement-level guard
// the round-10 rework added on web.
test('group modal: the in-flight guard disables the row and swallows a second press (round 11 S2)', async () => {
  state.me = {
    id: 'me-1',
    memberships: [{ group: GROUP_YES, roles: ['member'] }],
  };
  state.authData = {
    profile: {
      id: 'me-1',
      memberships: [{ group: { id: 'g-yes' }, roles: ['member'] }],
    },
  };
  let resolveShare: (v: undefined) => void = () => {};
  const onShare = jest.fn(
    () =>
      new Promise<undefined>((resolve) => {
        resolveShare = resolve;
      })
  );
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ShareIntoGroupModal, {
        open: true,
        onClose: jest.fn(),
        onShare,
      })
    );
  });
  // First press starts the share.
  await ReactTestRenderer.act(async () => {
    pressByText(tree.toJSON(), 'Yes Group');
  });
  expect(onShare).toHaveBeenCalledTimes(1);
  // In-flight: the row is disabled.
  expect(rowDisabled(tree.toJSON())).toBe(true);
  // A second press during the window is swallowed by the `if (sharing) return`
  // guard (the mocked Button forwards `onPress` even when `disabled`, so the
  // guard — not the presentation layer — is what's pinned).
  await ReactTestRenderer.act(async () => {
    pressByText(tree.toJSON(), 'Yes Group');
  });
  expect(onShare).toHaveBeenCalledTimes(1);
  // Settling the share re-enables the row.
  await ReactTestRenderer.act(async () => {
    resolveShare(undefined);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(rowDisabled(tree.toJSON())).toBe(false);
  tree.unmount();
});

test('group modal: a failed share resets the transient guard and re-enables the row (round 11 S2)', async () => {
  state.me = {
    id: 'me-1',
    memberships: [{ group: GROUP_YES, roles: ['member'] }],
  };
  state.authData = {
    profile: {
      id: 'me-1',
      memberships: [{ group: { id: 'g-yes' }, roles: ['member'] }],
    },
  };
  const onShare = jest.fn().mockRejectedValue(new Error('boom'));
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ShareIntoGroupModal, {
        open: true,
        onClose: jest.fn(),
        onShare,
      })
    );
  });
  // The rejected share settles (and `finally` clears `sharing`), re-enabling
  // the row rather than leaving it stuck disabled.
  expect(rowDisabled(tree.toJSON())).toBe(false);
  await ReactTestRenderer.act(async () => {
    pressByText(tree.toJSON(), 'Yes Group');
    // Let the microtask queue (settle the promise, then `finally`) flush.
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(rowDisabled(tree.toJSON())).toBe(false);
  tree.unmount();
});

// ---------- SendToConversationModal ----------

const CONVERSATION = [
  { id: 'root-1', visibility: 'direct', data: { type: 'note' } },
  {
    id: 'last-1',
    visibility: 'direct',
    profile: { id: 'other-1', handle: 'ada' },
    audience: [
      { id: 'me-1', handle: 'me' },
      { id: 'other-1', handle: 'ada', displayName: 'Ada' },
    ],
    data: { type: 'note', content: 'hello there' },
  },
];

test('conversation modal lists conversations loaded from useConversations (#1851 S4)', () => {
  state.me = { id: 'me-1' };
  state.conversations = [CONVERSATION];
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(SendToConversationModal, {
        open: true,
        onClose: jest.fn(),
        onSend: jest.fn(),
      })
    );
  });
  const text = collectText(tree.toJSON());
  // Title comes from the other participant (self excluded).
  expect(text).toContain('Ada');
  // Last-message snippet is the note content.
  expect(text).toContain('hello there');
  tree.unmount();
});

test('conversation modal shows a spinner while the list is loading (#1851 S4)', () => {
  state.me = { id: 'me-1' };
  state.conversationsLoading = true;
  state.conversations = [];
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(SendToConversationModal, {
        open: true,
        onClose: jest.fn(),
        onSend: jest.fn(),
      })
    );
  });
  // No rows, no empty-state copy, no buttons while loading.
  expect(collectText(tree.toJSON())).not.toContain('Ada');
  expect(collectText(tree.toJSON())).not.toContain(
    "You don't have any conversations yet"
  );
  tree.unmount();
});

test('conversation modal shows the empty state when there are none (#1851 S4)', () => {
  state.me = { id: 'me-1' };
  state.conversations = [];
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(SendToConversationModal, {
        open: true,
        onClose: jest.fn(),
        onSend: jest.fn(),
      })
    );
  });
  expect(collectText(tree.toJSON())).toContain(
    "You don't have any conversations yet"
  );
  tree.unmount();
});

test('conversation modal: sending calls onSend with the conversation, toasts success, closes (#1851 S4)', async () => {
  state.me = { id: 'me-1' };
  state.conversations = [CONVERSATION];
  const onSend = jest.fn().mockResolvedValue(undefined);
  const onClose = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(SendToConversationModal, {
        open: true,
        onClose,
        onSend,
      })
    );
  });
  await ReactTestRenderer.act(async () => {
    pressByText(tree.toJSON(), 'Ada');
  });
  expect(onSend).toHaveBeenCalledWith(CONVERSATION);
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'success', text1: 'Sent to Ada' })
  );
  expect(onClose).toHaveBeenCalled();
  tree.unmount();
});

test('conversation modal: a failed send toasts the error and keeps the sheet open (#1851 S4)', async () => {
  state.me = { id: 'me-1' };
  state.conversations = [CONVERSATION];
  const onSend = jest.fn().mockRejectedValue(new Error('boom'));
  const onClose = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(SendToConversationModal, {
        open: true,
        onClose,
        onSend,
      })
    );
  });
  await ReactTestRenderer.act(async () => {
    pressByText(tree.toJSON(), 'Ada');
  });
  expect(onSend).toHaveBeenCalledWith(CONVERSATION);
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'error',
      text1: "Couldn't share the post",
    })
  );
  expect(onClose).not.toHaveBeenCalled();
  tree.unmount();
});

/** Extract the row title text, so the assertion can't be satisfied by the
 *  "You:" snippet prefix of the last-message line. The mocked ThemedText
 *  drops `className`, so the row title is identified structurally: a
 *  ThemedText with exactly one text child that sits inside a row (an
 *  ancestor View carrying `onPress`, the mocked Button). The snippet line
 *  always renders three text pieces, and the sheet header is outside any
 *  row. */
const rowTitleTexts = (json: unknown): string[] => {
  const out: string[] = [];
  const visit = (node: unknown, inRow: boolean): void => {
    if (!node || typeof node !== 'object') return;
    const nodes = (Array.isArray(node) ? node : [node]) as {
      type?: unknown;
      props?: { onPress?: unknown };
      children?: unknown[];
    }[];
    for (const n of nodes) {
      if (!n) continue;
      const children = (n.children ?? []).filter(
        (c) => c !== null && c !== undefined
      ) as unknown[];
      const row = inRow || typeof n.props?.onPress === 'function';
      if (
        n.type === 'ThemedText' &&
        row &&
        children.length === 1 &&
        typeof children[0] === 'string'
      ) {
        out.push(children[0]);
      }
      visit(n.children, row);
    }
  };
  visit(json, false);
  return out;
};

test('conversation modal: last post names only the viewer → title falls back to the root post participant (#1851 S4)', () => {
  state.me = { id: 'me-1' };
  state.conversations = [
    [
      {
        id: 'root-1',
        visibility: 'direct',
        profile: { id: 'other-1', handle: 'ada' },
        audience: [
          { id: 'me-1', handle: 'me' },
          { id: 'other-1', handle: 'ada', displayName: 'Ada' },
        ],
        data: { type: 'note', content: 'hello' },
      },
      {
        id: 'last-1',
        visibility: 'direct',
        profile: { id: 'me-1', handle: 'me' },
        // The other participant left: the current audience is just the viewer.
        audience: [{ id: 'me-1', handle: 'me' }],
        data: { type: 'note', content: 'note to self' },
      },
    ],
  ];
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(SendToConversationModal, {
        open: true,
        onClose: jest.fn(),
        onSend: jest.fn(),
      })
    );
  });
  // The row is titled by the root participant, not "You".
  expect(rowTitleTexts(tree.toJSON())).toEqual(['Ada']);
  tree.unmount();
});

test('conversation modal: "You" title only when neither last nor root post names anyone else (#1851 S4)', () => {
  state.me = { id: 'me-1' };
  state.conversations = [
    [
      {
        id: 'root-1',
        visibility: 'direct',
        profile: { id: 'me-1', handle: 'me' },
        audience: [{ id: 'me-1', handle: 'me' }],
        data: { type: 'note', content: 'hello me' },
      },
    ],
  ];
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(SendToConversationModal, {
        open: true,
        onClose: jest.fn(),
        onSend: jest.fn(),
      })
    );
  });
  expect(rowTitleTexts(tree.toJSON())).toEqual(['You']);
  tree.unmount();
});

// Review round 7 S3: the modal's transient state is the in-flight
// `sending` guard (no separate selected-item state exists to lift). It can't
// survive a re-open: ShareMenu mounts the modal conditionally
// (`{conversationPickerOpen ? <SendToConversationModal/> : null}`), so
// closing the picker unmounts it and its state is discarded. A failing send
// also resets `sending` (the `finally` clears it), so the list re-enables
// rather than staying stuck disabled. `ShareIntoGroupModal` mirrors this with
// its `sharing` guard. A behavioral pin follows, plus a source-contract pin
// so a later refactor can't keep the sheet mounted (state-preserving) without
// re-proving the reset.
test('conversation modal: a failed send resets the transient guard and re-enables the rows (#1851 round 7 S3)', async () => {
  state.me = { id: 'me-1' };
  state.conversations = [CONVERSATION];
  const onSend = jest.fn().mockRejectedValue(new Error('boom'));
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(SendToConversationModal, {
        open: true,
        onClose: jest.fn(),
        onSend,
      })
    );
  });
  const row = rowTitleTexts(tree.toJSON());
  expect(row).toEqual(['Ada']);
  // While a send is in flight the rows are disabled; after the rejected send
  // settles the `finally` clears `sending`, re-enabling the list (and, since
  // the modal unmounts on close, a re-open would start clean regardless).
  expect(rowDisabled(tree.toJSON())).toBe(false);
  await ReactTestRenderer.act(async () => {
    pressByText(tree.toJSON(), 'Ada');
    // Let the microtask queue (settle the promise, then `finally`) flush.
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(rowDisabled(tree.toJSON())).toBe(false);
  tree.unmount();
});

// Review round 9 S2: the settled-state test above only observes the guard
// before and after the send; the in-flight window itself is what the state
// machine exists to protect (a double-press would fire a second send). Drive
// `onSend` with a promise the test resolves manually so the window can be
// observed: every row is disabled while `sending !== null`, and a second
// press inside the window is swallowed by the `if (!root || sending) return`
// guard (the mocked Button forwards `onPress` even when `disabled`, so the
// guard — not the presentation layer — is what's pinned).
test('conversation modal: the in-flight guard disables rows and swallows a second press (round 9 S2)', async () => {
  state.me = { id: 'me-1' };
  state.conversations = [CONVERSATION];
  let resolveSend: (v: undefined) => void = () => {};
  const onSend = jest.fn(
    () =>
      new Promise<undefined>((resolve) => {
        resolveSend = resolve;
      })
  );
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(SendToConversationModal, {
        open: true,
        onClose: jest.fn(),
        onSend,
      })
    );
  });
  // First press starts the send.
  await ReactTestRenderer.act(async () => {
    pressByText(tree.toJSON(), 'Ada');
  });
  expect(onSend).toHaveBeenCalledTimes(1);
  // In-flight: every row is disabled.
  expect(rowDisabled(tree.toJSON())).toBe(true);
  // A second press during the window is swallowed by the guard.
  await ReactTestRenderer.act(async () => {
    pressByText(tree.toJSON(), 'Ada');
  });
  expect(onSend).toHaveBeenCalledTimes(1);
  // Settling the send re-enables the rows.
  await ReactTestRenderer.act(async () => {
    resolveSend(undefined);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(rowDisabled(tree.toJSON())).toBe(false);
  tree.unmount();
});

/** True if any row (a View with an `onPress`) is currently disabled. */
const rowDisabled = (json: unknown): boolean => {
  let disabled = false;
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    for (const n of (Array.isArray(node) ? node : [node]) as {
      props?: { onPress?: unknown; disabled?: unknown };
      children?: unknown[];
    }[]) {
      if (!n) continue;
      if (
        typeof n.props?.onPress === 'function' &&
        n.props?.disabled === true
      ) {
        disabled = true;
      }
      visit(n.children);
    }
  };
  visit(json);
  return disabled;
};

// The re-open reset is guaranteed by conditional mounting, not by a
// `useEffect` cleanup inside the modal. Pin the contract in the source so a
// later refactor can't keep the sheet mounted (e.g. an `open`-gated
// BottomSheet that preserves state across open/close) without re-proving the
// reset. Mirrors the web-side pin in ShareMenu.test.tsx.
test('ShareMenu mounts the conversation modal conditionally, so its transient state is discarded on close (#1851 round 7 S3)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'ShareMenu.tsx'), 'utf8');
  // The modal is rendered only while `conversationPickerOpen` is true;
  // closing the picker unmounts it (and thus clears `sending`).
  expect(src).toMatch(
    /conversationPickerOpen\s*\?\s*\(\s*<SendToConversationModal/
  );
  expect(src).toMatch(/groupPickerOpen\s*\?\s*\(\s*<ShareIntoGroupModal/);
  // The modal itself owns no mount-lifecycle state reset (it relies on the
  // conditional mount above, not a `useEffect`).
  const modal = fs.readFileSync(
    path.join(__dirname, 'modals', 'SendToConversationModal.tsx'),
    'utf8'
  );
  expect(modal).not.toMatch(/useEffect/);
});
