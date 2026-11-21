/**
 * PostMenu mount-gated reaction/repost sheets (issue #2109 round 2).
 *
 * These pin the call-site contract after the mount-gating rework: both sheet
 * call sites (Reactions, Reposts) render their modal only while their `open`
 * prop is true, and `open` is a required prop on the modal components. This
 * file's regression guard is that PostMenu never mounts a sheet while its
 * state is closed, so a closed modal can never race its own `present()` on
 * mount.
 *
 * Mirrors FullEvent.test.tsx: every external import is mocked (node jest env,
 * no native modules); the decision tree under test is the modal mount logic.
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import Toast from 'react-native-toast-message';

// --- shared mutable state read by the module mocks (mock* = hoisting-safe) --
let mockProfile: { id: string; displayName?: string; handle?: string } | null =
  { id: 'u-1', displayName: 'Me', handle: 'me', following: [] };
// Draft publish gating (PostMenu's `canCreatePostTypeIgnoringScopes`).
let mockCanCreateDraft = true;
const mockClient = {
  posts: { deletePost: jest.fn(), pinPost: jest.fn() },
  profiles: { followProfile: jest.fn() },
};
// ReactionsModal/RepostModal record their mount + open props for assertions.
const mountedReactions: { open: boolean | undefined; onClose?: () => void }[] =
  [];
const mountedReposts: { open: boolean | undefined; onClose?: () => void }[] =
  [];

// --- react-native: host elements render as plain host tags ----------------
// Each factory uses `require('react')` (not a top-level `import React`) because
// jest.mock factories run during hoisted import resolution, before top-level
// bindings exist — the same convention FullEvent.test.tsx documents.
jest.mock('react-native', () => {
  const React = require('react');
  const make = (tag: string) => (props: { children?: ReactNode }) =>
    React.createElement(tag, props, props.children);
  return {
    View: make('View'),
    Pressable: make('Pressable'),
    TouchableOpacity: make('TouchableOpacity'),
    ActivityIndicator: () => null,
    Share: { share: jest.fn() },
  };
});

// --- i18n: resolve keys to their defaultValue -----------------------------
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}));

// --- openpeeps context -----------------------------------------------------
jest.mock('@openpeepshq/react', () => ({
  // PostMenu imports `apiErrorMessage` from this module for the draft
  // publish error toast.
  apiErrorMessage: (err: unknown) => String(err),
  useOpenpeeps: () => ({
    currentProfile: mockProfile,
    openpeepsApi: {
      useCurrentProfile: () => ({ data: mockProfile, refetch: jest.fn() }),
      useServerInfo: () => ({
        data: { feature_flags: { groups: true, events: true } },
      }),
      useCurrentProfileBookmarkedIds: () => ({ data: [], refetch: jest.fn() }),
      bookmarkPostAction: () => jest.fn(),
      unbookmarkPostAction: () => jest.fn(),
      deletePostAction: () => jest.fn(),
      updateGroupAction: () => jest.fn(),
      pinPostOnProfileAction: () => jest.fn(),
      followProfileAction: () => jest.fn().mockResolvedValue({ success: true }),
      unfollowProfileAction: () =>
        jest.fn().mockResolvedValue({ success: true }),
      admin: { pinPostGloballyAction: () => jest.fn() },
      // PostMenu builds the draft Publish mutation unconditionally.
      publishPostAction: () => jest.fn().mockResolvedValue({ id: 'post-1' }),
    },
    client: mockClient,
  }),
}));

// --- local modules ---------------------------------------------------------
jest.mock('../../../hooks/use-controlled-sheet', () => ({
  useControlledSheet: () => ({ current: {} }),
}));
jest.mock('../../../lib/utils', () => ({
  profileName: (p?: { displayName?: string; handle?: string }) =>
    p?.displayName ?? p?.handle ?? '',
  handleInternalURLNavigation: jest.fn(),
}));
jest.mock('../../../components/navigation/helpers', () => ({
  buildGoto: () => jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@react-navigation/native-stack', () => ({}));
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: () => null,
}));

// --- ui primitives ---------------------------------------------------------
// PostMenu imports its UI primitives from the `../../ui` barrel (mocked
// below); direct-path mocks for the individual modules are unreachable
// because jest resolves `jest.mock` by exact module path, so they are not
// kept here.

// Delete/confirm flow renders nothing under test.
jest.mock('./modals/DeletePostModal', () => ({
  DeletePostModal: () => null,
}));

// Current main's PostMenu also mounts the edit-history sheet; it is out of
// scope here, and its real module graph reaches ESM-only react-native-config,
// which Jest's CommonJS runtime cannot parse. Stub it out for the test.
jest.mock('./modals/PostEditHistoryModal', () => ({
  PostEditHistoryModal: () => null,
}));

// The two modals under test: record mount + open prop.
jest.mock('./modals/ReactionsModal', () => ({
  ReactionsModal: (props: { open?: boolean; onClose?: () => void }) => {
    mountedReactions.push({ open: props.open, onClose: props.onClose });
    return null;
  },
}));
jest.mock('./modals/RepostModal', () => ({
  RepostModal: (props: { open?: boolean; onClose?: () => void }) => {
    mountedReposts.push({ open: props.open, onClose: props.onClose });
    return null;
  },
}));

jest.mock('../../icons/index', () => ({
  PencilIcon: () => null,
  Trash2Icon: () => null,
  FlagIcon: () => null,
  UserXIcon: () => null,
  UsersPlusIcon: () => null,
  PinIcon: () => null,
  BookmarkPlusIcon: () => null,
  BookmarkMinusIcon: () => null,
  Repeat2Icon: () => null,
  HeartIcon: () => null,
  MessageCircleIcon: () => null,
  MoreVerticalIcon: () => null,
  LogOutIcon: () => null,
  MessageSquareReplyIcon: () => null,
  SaveIcon: () => null,
  RadioIcon: () => null,
  TriangleAlertIcon: () => null,
  FileTextIcon: () => null,
  BellOffIcon: () => null,
  BellPlusIcon: () => null,
  BadgeCheckIcon: () => null,
  ShareIcon: () => null,
  DownloadIcon: () => null,
  MapPinIcon: () => null,
  LinkIcon: () => null,
  Link2Icon: () => null,
  PhoneCallIcon: () => null,
  SendIcon: () => null,
  MessageSquareLockIcon: () => null,
  MessageSquarePlusIcon: () => null,
}));

jest.mock('../../ui/index', () => {
  const React = require('react');
  return {
    // The full barrel drags in avatar/dropdown natives; expose only the menu
    // surface PostMenu uses, backed by the same mock fakes as the direct mocks.
    PopupMenu: (props: { children?: ReactNode }) =>
      React.createElement('View', props, props.children),
    PopupMenuButton: (props: {
      text?: string;
      action?: unknown;
      onPress?: () => void;
      disabled?: boolean;
    }) =>
      React.createElement('View', {
        testID: `menu-${props.text}`,
        disabled: props.disabled,
        onPress:
          typeof props.action === 'function' && !props.disabled
            ? props.action
            : undefined,
      }),
    PopupSeparator: () => null,
    Avatar: () => null,
    Badge: () => null,
    Button: () => null,
  };
});

jest.mock('@openpeepshq/common', () => ({
  checkGroupCapabilities: () => ({}),
  checkRoleCapabilities: () => ({}),
  canCreatePostTypeIgnoringScopes: () => mockCanCreateDraft,
}));
jest.mock('@openpeepshq/common/lib', () => ({
  checkRoleCapabilities: () => ({}),
  // Current main's PostMenu gates the edit-history action on this; the edit
  // history is out of scope for these tests, so it stays hidden.
  postHasEditHistory: () => false,
}));
jest.mock('@openpeepshq/common/types', () => ({}), { virtual: true });

jest.mock('../../profile/ReportProfileOrPostModal', () => ({
  ReportProfileOrPostModal: () => null,
}));

jest.mock('../post-form/EditPostModalContext', () => ({
  useEditPostModal: () => ({ openEditPost: jest.fn() }),
}));

import { PostMenu } from './PostMenu';

// A "Join Jam" button is the host View that carries the label AND forwards
// onPress (only Button does). Search deepest-first so the button itself — not
// an ancestor container that merely contains the label — is returned.
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

const BASE_POST = {
  id: 'post-1',
  profile: { id: 'owner-1', displayName: 'Owner' },
  visibility: 'public',
  repostCount: 2,
  reactionCount: 3,
  data: { type: 'note', content: 'hello' },
};

function render(): ReactTestRenderer.ReactTestRenderer {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <PostMenu post={BASE_POST as never} deleteCallback={jest.fn()} />
    );
  });
  return tree;
}

beforeEach(() => {
  mockProfile = { id: 'u-1', displayName: 'Me', handle: 'me', following: [] };
  mockCanCreateDraft = true;
  mountedReactions.length = 0;
  mountedReposts.length = 0;
  (Toast.show as jest.Mock).mockClear();
});

test('1. closed state: no modal mounted, sheet does not present on mount', () => {
  const tree = render();
  expect(mountedReactions).toHaveLength(0);
  expect(mountedReposts).toHaveLength(0);
  tree.unmount();
});

test('2. reposts menu action mounts RepostModal with open=true', () => {
  const tree = render();
  const repostsItem = findByTestID(tree.toJSON(), 'menu-Reposts');
  expect(typeof repostsItem?.props?.onPress).toBe('function');
  ReactTestRenderer.act(() => {
    (repostsItem?.props?.onPress as () => void)();
  });
  expect(mountedReposts).toHaveLength(1);
  expect(mountedReposts[0].open).toBe(true);
  tree.unmount();
});

test('3. reactions menu action mounts ReactionsModal with open=true', () => {
  const tree = render();
  const reactionsItem = findByTestID(tree.toJSON(), 'menu-Reactions');
  expect(typeof reactionsItem?.props?.onPress).toBe('function');
  ReactTestRenderer.act(() => {
    (reactionsItem?.props?.onPress as () => void)();
  });
  expect(mountedReactions).toHaveLength(1);
  expect(mountedReactions[0].open).toBe(true);
  tree.unmount();
});

test('4. closing the modal via onClose fully unmounts it (no remount with open=false)', () => {
  const tree = render();
  const repostsItem = findByTestID(tree.toJSON(), 'menu-Reposts');
  ReactTestRenderer.act(() => {
    (repostsItem?.props?.onPress as () => void)();
  });
  expect(mountedReposts).toHaveLength(1);
  // onClose flips state closed -> conditional unmount
  // (no {open:false} remount).
  ReactTestRenderer.act(() => {
    mountedReposts[0].onClose?.();
  });
  expect(mountedReposts).toHaveLength(1); // no remount with open=false
  tree.unmount();
});

test('5. follow/unfollow toasts render the shared profile.follow.* keys (#2110)', async () => {
  const tree = render();
  const followItem = findByTestID(tree.toJSON(), 'menu-Follow');
  expect(typeof followItem?.props?.onPress).toBe('function');
  await ReactTestRenderer.act(async () => {
    await (followItem?.props?.onPress as () => Promise<void>)();
  });
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({ text1: 'profile.follow.followedSuccess' })
  );

  // Flip to following so the menu exposes Unfollow, then assert its toast.
  mockProfile = { ...mockProfile, following: [{ id: BASE_POST.profile.id }] };
  const tree2 = render();
  const unfollowItem = findByTestID(tree2.toJSON(), 'menu-Unfollow');
  expect(typeof unfollowItem?.props?.onPress).toBe('function');
  await ReactTestRenderer.act(async () => {
    await (unfollowItem?.props?.onPress as () => Promise<void>)();
  });
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({ text1: 'profile.follow.unfollowedSuccess' })
  );
  tree.unmount();
  tree2.unmount();
});

// Draft publish (#382): offered only for a draft, enabled when the author
// can still post at the draft's visibility, success/error toasts wired.
test('6. draft post: Publish action toasts success; blocked visibility disables it', async () => {
  const draftPost = {
    ...BASE_POST,
    isDraft: true,
    profile: { id: 'u-1', displayName: 'Me' },
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <PostMenu post={draftPost as never} deleteCallback={jest.fn()} />
    );
  });

  // A non-draft post never offers the action.
  const baseTree = render();
  expect(findByTestID(baseTree.toJSON(), 'menu-Publish')).toBeUndefined();

  const publishItem = findByTestID(tree.toJSON(), 'menu-Publish');
  expect(publishItem).toBeDefined();
  expect(publishItem?.props?.disabled).toBe(false);
  await ReactTestRenderer.act(async () => {
    await (publishItem?.props?.onPress as () => Promise<void>)();
  });
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({ text1: 'posts.create.successToast' })
  );
  tree.unmount();
  baseTree.unmount();

  // Lost permission to post at the draft's visibility -> disabled + warning
  // (the button keeps its `text`, only the title flips to the warning).
  mockCanCreateDraft = false;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <PostMenu post={draftPost as never} deleteCallback={jest.fn()} />
    );
  });
  const blockedItem = findByTestID(tree.toJSON(), 'menu-Publish');
  expect(blockedItem).toBeDefined();
  expect(blockedItem?.props?.disabled).toBe(true);
  tree.unmount();
});
