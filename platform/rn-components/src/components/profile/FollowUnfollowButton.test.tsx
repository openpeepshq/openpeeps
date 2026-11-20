/**
 * FollowUnfollowButton regression coverage (issue #2110 re-report).
 *
 * The #2110 defect class is a t() call site pointing at a key that does not
 * exist in en.json: i18next then renders the raw key path as the visible
 * toast. PostMenu.test.tsx already pins the post-menu toasts to the shared
 * profile.follow.* keys; this file pins the follow/unfollow BUTTON — the
 * surface the re-report names ("when I click on the follow/unfollow button")
 * and the one that had no coverage at all. Each test name names the key or
 * behavior it guards so the regression link stays visible.
 *
 * Node jest env (no native modules), mirroring PostMenu.test.tsx: the Button/
 * ThemedText UI primitives, the openpeeps context, and react-native-toast-
 * message are mocked so the toast key and the press/loading decisions are
 * observable without native modules.
 *
 * The guard has two sides, matching the two ways the #2110 class regresses:
 * the call-site side (the button must reference the shared profile.follow.*
 * keys, not the missing profile.actions.* ones) is pinned by the toast/label
 * assertions, and the dictionary side (those keys must actually exist in
 * en.json, or i18next renders the raw key path) is pinned by the final test,
 * so deleting a pinned key from en.json fails this file in isolation.
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { PublicProfile } from '@openpeepshq/common/types';
import Toast from 'react-native-toast-message';

// React 19 act() requires the act environment flag, or it warns on every act().
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// --- shared mutable state read by the module mocks (mock* = hoisting-safe) --
let mockMe: { id: string; following: { id: string }[] } | null = {
  id: 'me-1',
  following: [],
};
const followAction = jest.fn().mockResolvedValue({ success: true });
const unfollowAction = jest.fn().mockResolvedValue({ success: true });
const mockQueryClient = { invalidateQueries: jest.fn() };

// --- i18n: resolve keys to their defaultValue -----------------------------
// The production locale is fetched at runtime, so the key STRING itself is
// the regression signal: a key that i18next cannot resolve to a string leaf
// renders as the raw key path. The toast/label assertions below therefore pin
// the call site to the shared profile.follow.* keys; the final test pins the
// dictionary side (those keys exist in en.json).
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}));

// --- openpeeps context -----------------------------------------------------
// useFollowProfile is mocked (not the real hook) so the component's toast and
// press/loading logic is exercised in isolation; isSelf/isFollowing are
// derived from the shared mockMe the same way the real hook does. The
// component's post-success callback (query invalidation + onSuccess prop) is
// the hook's second argument and fires after the action resolves.
jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    queryClient: mockQueryClient,
    openpeepsApi: {
      useCurrentProfile: () => ({ data: mockMe, refetch: jest.fn() }),
      followProfileAction: () => followAction,
      unfollowProfileAction: () => unfollowAction,
    },
  }),
  useFollowProfile: (profile: { id: string }, onSuccess?: () => void) => {
    const me = mockMe;
    const isSelf = !me || me.id === profile.id;
    const isFollowing = !!me?.following?.some((f) => f.id === profile.id);
    return {
      me,
      isSelf,
      isFollowing,
      follow: async () => {
        await followAction({ reblogs: true, notify: true });
        onSuccess?.();
      },
      unfollow: async () => {
        await unfollowAction(undefined);
        onSuccess?.();
      },
    };
  },
}));

// --- local modules ---------------------------------------------------------
jest.mock('../../lib/utils', () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(' '),
}));

// --- ui primitives ---------------------------------------------------------
// The real Button/ThemedText drag in cva/@rn-primitives/theme providers;
// stub them to host tags. Button forwards `onPress`, `disabled`, and
// `className` so the press/loading decisions and the compact size class are
// drivable and assertable, and renders its (ThemedText) children so the
// visible label can be asserted via collectText. There is a single button in
// the tree, so a fixed testID identifies it.
jest.mock('../ui/button', () => {
  const React = require('react');
  return {
    Button: (props: {
      children?: ReactNode;
      onPress?: () => void;
      disabled?: boolean;
      className?: string;
    }) =>
      React.createElement(
        'button',
        {
          testID: 'follow-btn',
          disabled: props.disabled,
          onPress: props.onPress,
          className: props.className,
        },
        props.children
      ),
  };
});
jest.mock('../ui/themed-text', () => {
  const React = require('react');
  return {
    ThemedText: (props: { children?: ReactNode }) =>
      React.createElement('span', null, props.children),
  };
});
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

import { FollowUnfollowButton } from './FollowUnfollowButton';

const OTHER: PublicProfile = {
  id: 'other-1',
  handle: 'someone',
  displayName: 'Someone',
} as PublicProfile;
const SELF: PublicProfile = {
  id: 'me-1',
  handle: 'me',
  displayName: 'Me',
} as PublicProfile;

type TreeNode = {
  type?: string;
  props?: Record<string, unknown> | null;
  children?: (TreeNode | string | null)[];
};

function findByTestID(json: unknown, testID: string): TreeNode | undefined {
  if (json === null || typeof json !== 'object') return undefined;
  const node = json as TreeNode;
  if (node.props?.testID === testID) return node;
  for (const c of node.children || []) {
    if (typeof c !== 'string' && c !== null) {
      const found = findByTestID(c, testID);
      if (found) return found;
    }
  }
  return undefined;
}

// The Button mock renders a single button (testID `follow-btn`) whose child
// is a <span> wrapping the label string. collectText returns every text node
// under a node, so collectText(button(tree)) is the button's own label.
function collectText(json: unknown): string[] {
  if (json === null || typeof json === 'string') {
    return typeof json === 'string' ? [json] : [];
  }
  const node = json as TreeNode;
  const out: string[] = [];
  for (const c of node.children || []) {
    out.push(...collectText(c));
  }
  return out;
}

function render(
  profile: PublicProfile,
  opts: { compact?: boolean; onSuccess?: () => void } = {}
): ReactTestRenderer.ReactTestRenderer {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <FollowUnfollowButton profile={profile} {...opts} />
    );
  });
  return tree;
}

function button(tree: ReactTestRenderer.ReactTestRenderer): TreeNode {
  const btn = findByTestID(tree.toJSON(), 'follow-btn');
  if (!btn) throw new Error('follow button not found in tree');
  return btn;
}

// The shared "tap the button and settle its promise" sequence, so the toast
// and callback tests stay one assertion-heavy line apart.
async function pressButton(
  tree: ReactTestRenderer.ReactTestRenderer
): Promise<void> {
  await ReactTestRenderer.act(async () => {
    await (button(tree).props?.onPress as () => Promise<void>)();
  });
}

// This file sets IS_REACT_ACT_ENVIRONMENT, so React warns about any update
// not wrapped in act() — including unmount. Wrap the unmount so the run
// output stays clean and a real act() warning stays visible.
async function unmount(
  tree: ReactTestRenderer.ReactTestRenderer
): Promise<void> {
  await ReactTestRenderer.act(async () => {
    tree.unmount();
  });
}

beforeEach(() => {
  mockMe = { id: 'me-1', following: [] };
  followAction.mockClear().mockResolvedValue({ success: true });
  unfollowAction.mockClear().mockResolvedValue({ success: true });
  mockQueryClient.invalidateQueries.mockClear();
  (Toast.show as jest.Mock).mockClear();
});

test('1. follow tap toasts profile.follow.followedSuccess — guards the #2110 profile.actions.followedSuccess regression', async () => {
  const tree = render(OTHER);
  expect(collectText(button(tree))).toEqual(['profile.actions.follow']);
  await pressButton(tree);
  expect(followAction).toHaveBeenCalledTimes(1);
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'success',
      text1: 'profile.follow.followedSuccess',
    })
  );
  // The #2110 regression is this: a toast keyed on a missing
  // profile.actions.* key, which i18next renders as the raw key string.
  expect(Toast.show).not.toHaveBeenCalledWith(
    expect.objectContaining({ text1: 'profile.actions.followedSuccess' })
  );
  await unmount(tree);
});

test('2. unfollow tap toasts profile.follow.unfollowedSuccess — guards the #2110 profile.actions.unfollowedSuccess regression', async () => {
  mockMe = { id: 'me-1', following: [{ id: OTHER.id }] };
  const tree = render(OTHER);
  expect(collectText(button(tree))).toEqual(['profile.actions.unfollow']);
  await pressButton(tree);
  expect(unfollowAction).toHaveBeenCalledTimes(1);
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'success',
      text1: 'profile.follow.unfollowedSuccess',
    })
  );
  expect(Toast.show).not.toHaveBeenCalledWith(
    expect.objectContaining({ text1: 'profile.actions.unfollowedSuccess' })
  );
  await unmount(tree);
});

test('3. a failed follow toasts profile.follow.error — the same missing-toast-key class as #2110', async () => {
  followAction.mockRejectedValueOnce(new Error('network down'));
  const tree = render(OTHER);
  await pressButton(tree);
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'error',
      text1: 'profile.follow.error',
    })
  );
  await unmount(tree);
});

test('4. loading: disabled button + common.states.loading label until the action settles', async () => {
  let resolveFollow: (v: { success: boolean }) => void = () => {};
  followAction.mockImplementationOnce(
    () =>
      new Promise<{ success: boolean }>((resolve) => {
        resolveFollow = resolve;
      })
  );
  const tree = render(OTHER);
  expect(button(tree).props?.disabled).toBe(false);
  // Fire the press (async, in flight) without awaiting it, so the component is
  // left in its isLoading state; act flushes the state update.
  let followPromise: Promise<void>;
  ReactTestRenderer.act(() => {
    followPromise = (button(tree).props?.onPress as () => Promise<void>)();
  });
  expect(button(tree).props?.disabled).toBe(true);
  expect(collectText(button(tree))).toEqual(['common.states.loading']);
  // Settle the in-flight follow.
  await ReactTestRenderer.act(async () => {
    resolveFollow({ success: true });
    await followPromise;
  });
  expect(button(tree).props?.disabled).toBe(false);
  expect(collectText(button(tree))).toEqual(['profile.actions.follow']);
  expect(followAction).toHaveBeenCalledTimes(1);
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({ text1: 'profile.follow.followedSuccess' })
  );
  await unmount(tree);
});

test('5. own profile: the button renders nothing (no toast surface to regress)', async () => {
  const tree = render(SELF);
  expect(tree.toJSON()).toBeNull();
});

test('6. compact prop renders the smaller h-8/px-3 size class', async () => {
  const regular = render(OTHER);
  expect(String(button(regular).props?.className)).toContain('native:h-10');
  expect(String(button(regular).props?.className)).toContain('native:px-5');
  await unmount(regular);

  const tree = render(OTHER, { compact: true });
  const cls = String(button(tree).props?.className);
  expect(cls).toContain('native:h-8');
  expect(cls).toContain('native:px-3');
  expect(cls).not.toContain('native:h-10');
  expect(cls).not.toContain('native:px-5');
  await unmount(tree);
});

test('7. onSuccess fires exactly once per successful action, after query invalidation', async () => {
  const onSuccess = jest.fn();
  const tree = render(OTHER, { onSuccess });
  await pressButton(tree); // follow success
  expect(onSuccess).toHaveBeenCalledTimes(1);
  expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(1);
  await unmount(tree);

  mockMe = { id: 'me-1', following: [{ id: OTHER.id }] };
  const tree2 = render(OTHER, { onSuccess });
  await pressButton(tree2); // unfollow success
  expect(onSuccess).toHaveBeenCalledTimes(2);
  expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(2);
  await unmount(tree2);
});

// The dictionary side of the #2110 guard: the mocked t() cannot resolve a
// key i18next would render as the raw key path, so this test reads the real
// shipped dictionary instead — every key the assertions above pin must be a
// string leaf in en.json (or the toast renders the raw key path in the app),
// while the missing profile.actions.* success keys from #2110 must stay
// absent so the regression the file guards stays detectable.
const EN_LOCALE: unknown = require('../../../../i18n/src/locales/en.json');
function enLeaf(key: string): unknown {
  let cur: unknown = EN_LOCALE;
  for (const part of key.split('.')) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

test('8. every pinned key is a string leaf in en.json — deleting one fails this file (guards the #2110 raw-key-path regression)', () => {
  for (const key of [
    'profile.follow.followedSuccess',
    'profile.follow.unfollowedSuccess',
    'profile.follow.error',
    'profile.actions.follow',
    'profile.actions.unfollow',
    'common.states.loading',
  ]) {
    expect(typeof enLeaf(key)).toBe('string');
  }
  expect(enLeaf('profile.actions.followedSuccess')).toBeUndefined();
  expect(enLeaf('profile.actions.unfollowedSuccess')).toBeUndefined();
});
