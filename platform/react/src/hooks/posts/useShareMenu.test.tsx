/** @vitest-environment jsdom */
// Issue #654: the "Repost to community" gate and action in `useShareMenu`.
// The action must route through the post-creation endpoint (`createPost`) with
// a public note carrying the source link — not the repost endpoint — and the
// menu only offers it when the caller passes the public-note write gate.
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AuthorizationData,
  GroupWithMeta,
  PublicPost,
} from '@openpeepshq/common/types';
import { groupCapabilityTemplates } from '@openpeepshq/common/lib';
import { useShareMenu } from './useShareMenu';

const postGroupId = 'group-post-1';

const publicGroup: GroupWithMeta = {
  id: postGroupId,
  handle: 'publicgroup',
  capabilities: groupCapabilityTemplates.publicGroup.capabilities,
} as unknown as GroupWithMeta;

// No `none` role can read it, so `isGroupDiscoverable` is false.
const privateGroup: GroupWithMeta = {
  ...publicGroup,
  handle: 'privategroup',
  capabilities:
    groupCapabilityTemplates.defaultGroupClosedCommunity.capabilities,
} as unknown as GroupWithMeta;

type State = {
  viewer: 'signed-in' | 'signed-out';
  roleCaps: string[];
  scopes: unknown[];
  group: GroupWithMeta;
  created: { payload?: unknown; id: string }[];
  createError?: Error;
};

let state: State;

const makeProfile = () =>
  ({
    id: 'profile-1',
    handle: 'member',
    roles: [
      {
        capabilities: { add: state.roleCaps, remove: [] },
      },
    ],
  }) as unknown as AuthorizationData['profile'];

const makeAuthData = (): AuthorizationData =>
  ({
    profile: state.viewer === 'signed-out' ? undefined : makeProfile(),
    scopes: state.scopes,
  }) as unknown as AuthorizationData;

const makePost = (): PublicPost =>
  ({
    id: 'post-1',
    type: 'note',
    visibility: 'group',
    data: { type: 'note', content: 'A note' },
    group: state.group,
    profile: { id: 'profile-author', handle: 'author' },
  }) as unknown as PublicPost;

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      repostPostAction: () => () => {},
      createPostAction: () => (payload: unknown) => {
        state.created.push({ payload, id: 'created-42' });
        if (state.createError) return Promise.reject(state.createError);
        return Promise.resolve({ id: 'created-42' });
      },
    },
  }),
}));
vi.mock('../../components/layout/IdentityContext', () => ({
  useCurrentProfile: () =>
    state.viewer === 'signed-out' ? undefined : makeProfile(),
  useAuthData: () => makeAuthData(),
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

describe('useShareMenu community-repost gate and action', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state = {
      viewer: 'signed-in',
      roleCaps: ['core-posts-create-note-public'],
      scopes: [{ scopeLevel: 'write', resource: { type: 'posts' } }],
      group: publicGroup,
      created: [],
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

  it('offers it to a signed-in profile with the public-note write path', () => {
    renderHook();
    expect(captured?.signedIn).toBe(true);
    expect(captured?.isPublicPostGroup).toBe(true);
    expect(captured?.canRepostToCommunity).toBe(true);
  });

  it('hides it for a signed-out viewer', () => {
    state.viewer = 'signed-out';
    renderHook();
    expect(captured?.signedIn).toBe(false);
    expect(captured?.canRepostToCommunity).toBe(false);
  });

  it('hides it without the public-note role capability', () => {
    state.roleCaps = ['core-posts-create-note'];
    renderHook();
    expect(captured?.canRepostToCommunity).toBe(false);
  });

  it('hides it without the posts write scope', () => {
    state.scopes = [];
    renderHook();
    expect(captured?.canRepostToCommunity).toBe(false);
  });

  it('does not flag a post without a public group', () => {
    state.group = privateGroup;
    renderHook();
    expect(captured?.isPublicPostGroup).toBe(false);
    // The action still exists but the menu would not offer it (label falls
    // back to plain "Repost") because the group is not discoverable.
    expect(captured?.canRepostToCommunity).toBe(true);
  });

  it('creates a public note whose content is the source link via createPost', async () => {
    renderHook();
    const created = await captured!.repostToCommunity();
    expect(created).toEqual({ id: 'created-42' });
    expect(state.created).toHaveLength(1);
    expect(state.created[0]!.payload).toEqual({
      visibility: 'public',
      type: 'note',
      data: {
        type: 'note',
        content: 'https://community.example/posts/post-1',
      },
    });
  });

  it('surfaces a createPost failure to the caller', async () => {
    state.createError = new Error('403');
    renderHook();
    await expect(captured!.repostToCommunity()).rejects.toThrow('403');
  });
});
