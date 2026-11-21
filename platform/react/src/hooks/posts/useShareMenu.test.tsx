/** @vitest-environment jsdom */
// Review round 7, S3: the community-repost gates in `useShareMenu` had no
// hook-level tests — the menus' render tests only asserted menu-item
// visibility from the hook's returned flags. These exercise the real gate
// logic (type-scoped group availability × public-note write path) through
// the hook, so a change to either gate breaks here before it breaks UI parity.
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AuthorizationData,
  CapabilitiesConfig,
  GroupWithMeta,
  PublicPost,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { groupCapabilityTemplates } from '@openpeepshq/common/lib';
import { useShareMenu } from './useShareMenu';

const postGroupId = 'group-post-1';

type ScopeLike = {
  scopeLevel: 'read' | 'write' | 'admin';
  resource: { type: string; id?: string };
};

const postsWrite: ScopeLike = { scopeLevel: 'write', resource: { type: 'posts' } };
// The type-scoped group gate (`core-posts-create-${type}`) computes an
// `admin`-level required scope on the group id (the capability name doesn't
// end in `-create`/`-update`/`-delete`), matching the `admin * *` scope a real
// signed profile token carries.
const groupAdmin: ScopeLike = {
  scopeLevel: 'admin',
  resource: { type: 'groups', id: postGroupId },
};

const emptyConfig: CapabilitiesConfig = {
  post: { none: { add: [], remove: [] } },
  profile: { none: { add: [], remove: [] } },
  report: { none: { add: [], remove: [] } },
  accessToken: { none: { add: [], remove: [] } },
};

const publicGroup: GroupWithMeta = {
  id: postGroupId,
  handle: 'test-group',
  capabilities: groupCapabilityTemplates.publicGroup.capabilities,
} as unknown as GroupWithMeta;

// A public group whose `member` role cannot create the source post's type:
// the type-scoped gate (`core-posts-create-${type}`) must keep
// `canRepostToCommunity` false even with the full public-note write path.
const publicGroupWithoutEventCreate: GroupWithMeta = {
  ...publicGroup,
  capabilities: {
    ...groupCapabilityTemplates.publicGroup.capabilities,
    member: {
      add: ['core-posts-reply', 'core-posts-rsvp', 'core-posts-vote', 'core-posts-create-note'],
      remove: [],
    },
  },
} as unknown as GroupWithMeta;

// Same membership capabilities, but the `none` role cannot read it, so
// `isPublicGroup` (and the hook's `isPublicPostGroup`) is false.
const privateGroup: GroupWithMeta = {
  ...publicGroup,
  capabilities: {
    none: { add: [], remove: [] },
    member: { add: ['core-posts-create-note', 'core-posts-reply'], remove: [] },
  },
} as unknown as GroupWithMeta;

// The post author — never the viewer, so no `self` profile relationship.
const authorProfile: ProfileWithMeta = {
  id: 'profile-author',
  handle: 'author',
  displayName: 'Author',
  roles: [],
  memberships: [],
  followers: [],
  following: [],
} as unknown as ProfileWithMeta;

type State = {
  viewer: 'member' | 'non-member' | 'anon';
  group: GroupWithMeta;
  postType: string;
  roleCaps: string[];
  scopes: ScopeLike[];
};

let state: State;

const makeViewerProfile = (): ProfileWithMeta =>
  ({
    id: state.viewer === 'non-member' ? 'profile-outsider' : 'profile-1',
    handle: state.viewer === 'non-member' ? 'outsider' : 'member',
    displayName: 'Viewer',
    roles: state.roleCaps.map((capability) => ({
      id: capability,
      name: capability,
      key: capability,
      capabilities: { add: state.roleCaps, remove: [] },
    })),
    memberships:
      state.viewer === 'member'
        ? [{ group: state.group, roles: ['member'] }]
        : [],
    followers: [],
    following: [],
  }) as unknown as ProfileWithMeta;

const makeAuthData = (): AuthorizationData =>
  ({
    profile: state.viewer === 'anon' ? undefined : makeViewerProfile(),
    scopes: state.scopes.length ? (state.scopes as unknown as AuthorizationData['scopes']) : undefined,
  }) as unknown as AuthorizationData;

const makePost = (): PublicPost =>
  ({
    id: 'post-1',
    data: { content: 'A note', type: state.postType },
    type: state.postType,
    visibility: 'group',
    group: state.group,
    groupId: state.group.id,
    profile: authorProfile,
  }) as unknown as PublicPost;

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: { repostPostAction: () => () => {} },
  }),
}));
vi.mock('../../components/layout/IdentityContext', () => ({
  useCurrentProfile: () =>
    state.viewer === 'anon' ? undefined : makeViewerProfile(),
  useAuthData: () => makeAuthData(),
}));
vi.mock('../../components/server-data', () => ({
  useCapabilities: () => emptyConfig,
}));

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let captured: ReturnType<typeof useShareMenu> | undefined;

const renderHook = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const Host = (): ReactNode => {
    captured = useShareMenu(
      makePost(),
      'https://community.example/posts/post-1',
    );
    return null;
  };
  act(() => {
    root?.render(createElement(Host));
  });
};

describe('useShareMenu community-repost gates', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state = {
      viewer: 'member',
      group: publicGroup,
      postType: 'note',
      roleCaps: ['core-posts-create-note-public'],
      scopes: [postsWrite, groupAdmin],
    };
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    captured = undefined;
  });

  it('hides the community repost for signed-out viewers', () => {
    state.viewer = 'anon';
    renderHook();
    expect(captured?.signedIn).toBe(false);
    expect(captured?.canRepostToCommunity).toBe(false);
  });

  it('hides it for a non-member of the source group', () => {
    state.viewer = 'non-member';
    renderHook();
    expect(captured?.canRepostToCommunity).toBe(false);
  });

  it('offers it to a member with the public-note write path', () => {
    renderHook();
    expect(captured?.isPublicPostGroup).toBe(true);
    expect(captured?.canRepostToCommunity).toBe(true);
  });

  it('hides it without the posts write scope', () => {
    state.scopes = [groupAdmin];
    renderHook();
    expect(captured?.canRepostToCommunity).toBe(false);
  });

  it('hides it without the group admin scope the type-scoped gate requires', () => {
    state.scopes = [postsWrite];
    renderHook();
    expect(captured?.canRepostToCommunity).toBe(false);
  });

  it('hides it without the public-note role capability', () => {
    state.roleCaps = ['core-posts-create-note'];
    renderHook();
    expect(captured?.canRepostToCommunity).toBe(false);
  });

  // Review round 7, S2: the group gate is type-scoped, so a member who lacks
  // `core-posts-create-${type}` for the source post's type gets no community
  // repost even with the full public-note write path.
  it('hides it when the group lacks the type-scoped create capability', () => {
    state.postType = 'event';
    state.group = publicGroupWithoutEventCreate;
    renderHook();
    expect(captured?.canRepostToCommunity).toBe(false);
  });

  it('does not flag a private group as public, so the menu keeps the item hidden', () => {
    state.group = privateGroup;
    renderHook();
    // The member gate still passes (the private template grants
    // `core-posts-create-note` to `member`) — the public-group flag is what
    // keeps the "Repost to community" item out of the menu.
    expect(captured?.isPublicPostGroup).toBe(false);
    expect(captured?.canRepostToCommunity).toBe(true);
  });
});
