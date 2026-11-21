/**
 * Share-into-group / send-to-conversation modal behavior (issue #1851, review
 * round 29121 S4).
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
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import Toast from 'react-native-toast-message';

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

jest.mock('@openpeepshq/react', () => ({
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
}));

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
