/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PostMenu } from './PostMenu';
// The real shipped locale files: the `useT` mock resolves keys to their
// defaultValue, and the assertions below compare the rendered copy against
// these JSON files, so a rename/removal/rewording of a key fails this test
// instead of the copy silently drifting from the JSON.
import enLocales from '../../../../../i18n/src/locales/en.json';
import deLocales from '../../../../../i18n/src/locales/de.json';

const state = vi.hoisted(() => ({
  canPublish: true,
  publish: vi.fn(async () => ({ id: 'post-1' })),
  // The PopupMenuButton mock records each item's action here, keyed by its
  // `text`, so a test can drive the real handler directly (the Radix menu
  // would otherwise only invoke it on a portal click).
  actions: {} as Record<string, (() => Promise<unknown>) | undefined>,
}));

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('@openpeepshq/common/lib', () => ({
  canCreatePostTypeIgnoringScopes: () => state.canPublish,
  checkPostCapabilities: () => ({ success: true }),
  checkGroupCapabilities: () => ({ success: false }),
  checkRoleCapabilities: () => ({ success: false }),
  postHasEditHistory: () => false,
}));

vi.mock('../../layout/IdentityContext', () => ({
  useCurrentProfile: () => ({ id: 'me-1' }),
  useAuthData: () => ({ profile: { id: 'me-1' }, scopes: [] }),
}));

vi.mock('../../server-data', () => ({
  useCapabilities: () => [],
  useServerInfo: () => ({ data: { communityConfig: {} } }),
}));

vi.mock('../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useCurrentProfileBookmarkedIds: () => ({ data: [] }),
      followProfileAction: () => vi.fn(),
      unfollowProfileAction: () => vi.fn(),
      bookmarkPostAction: () => vi.fn(),
      unbookmarkPostAction: () => vi.fn(),
      publishPostAction: () => state.publish,
      updateGroupAction: () => vi.fn(),
      pinPostGloballyAction: () => vi.fn(),
      pinPostOnProfileAction: () => vi.fn(),
      admin: { pinPostGloballyAction: () => vi.fn() },
    },
  }),
}));

vi.mock('../../profile/ReportProfileOrPostModal', () => ({
  ReportProfileOrPostModal: () => null,
}));
vi.mock('./modals/DeletePostModal', () => ({ DeletePostModal: () => null }));
vi.mock('./modals/PostEditHistoryModal', () => ({
  PostEditHistoryModal: () => null,
}));
vi.mock('./modals/ReactionsModal', () => ({ ReactionsModal: () => null }));
vi.mock('./modals/RepostModal', () => ({ RepostModal: () => null }));
vi.mock('../post-form/EditPostModalContext', () => ({
  useEditPostModal: () => ({ openEditPost: vi.fn() }),
}));
// The lucide icons PostMenu imports, as no-op components (a per-icon Proxy
// makes the module namespace look thenable and breaks vitest ESM interop).
vi.mock('lucide-react', () => {
  const Icon = () => null;
  return {
    AlertTriangle: Icon,
    BookmarkMinus: Icon,
    BookmarkPlus: Icon,
    FlagIcon: Icon,
    History: Icon,
    Pencil: Icon,
    Pin: Icon,
    Repeat2: Icon,
    Send: Icon,
    ThumbsUp: Icon,
    Trash: Icon,
  };
});

// The real PopupMenu (Radix) mounts items in a portal only once opened;
// substitute static items that surface title/text/disabled (same approach as
// ShareMenu.test.tsx).
vi.mock('@openpeepshq/react-ui', async () => {
  const React = await import('react');
  const Item = (props: {
    text?: string;
    title?: string;
    action?: unknown;
    icon?: unknown;
    disabled?: boolean;
  }) => {
    // Register the real action keyed by its visible text so a test can drive
    // it directly; the button's onClick mirrors the Radix menu's behavior.
    if (props.text) state.actions[props.text] = props.action as never;
    return React.createElement(
      'button',
      {
        type: 'button',
        title: props.title,
        'data-text': props.text,
        disabled: props.disabled || false,
        onClick: props.action,
      },
      props.text ?? props.title,
    );
  };
  return {
    PopupMenu: (props: { children?: React.ReactNode }) =>
      React.createElement('div', null, props.children),
    PopupMenuButton: Item,
    PopupSeparator: () => React.createElement('hr'),
  };
});

const DRAFT_POST = {
  id: 'post-1',
  visibility: 'public',
  isDraft: true,
  profile: { id: 'me-1', displayName: 'Me' },
  data: { type: 'note', content: 'draft' },
} as never;

const publishButton = (container: HTMLDivElement) =>
  [...container.querySelectorAll('button')].find(
    (b) => b.getAttribute('data-text') === 'Publish',
  );

describe('PostMenu draft publish (#382)', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state.canPublish = true;
    state.actions = {};
    state.publish.mockReset().mockResolvedValue({ id: 'post-1' });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(PostMenu, { post: DRAFT_POST }));
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('enabled state: Publish is offered and not disabled', () => {
    const button = publishButton(container!);
    expect(button).toBeTruthy();
    expect(button!.hasAttribute('disabled')).toBe(false);
    expect(button!.getAttribute('title')).toBe('Publish');
    // No warning while publishing is still allowed (apostrophe-free prefix,
    // same reason as the disabled-state case below).
    expect(container!.innerHTML).not.toContain(
      'You no longer have permission to post at this draft',
    );
  });

  it('disabled state pins the shipped copy (title flips to publishDisabled)', () => {
    act(() => {
      state.canPublish = false;
      root?.render(createElement(PostMenu, { post: DRAFT_POST }));
    });
    const button = publishButton(container!);
    expect(button).toBeTruthy();
    expect(button!.hasAttribute('disabled')).toBe(true);
    // The mock `useT` resolves keys to their English defaultValue, so the
    // rendered copy is the en string — pin it against the shipped en.json (a
    // rename/removal/reword of the key fails this). The disabled title is the
    // publishDisabled string, not the plain publish string.
    expect(button!.getAttribute('title')).toBe(
      enLocales.posts.menu.publishDisabled,
    );
    expect(button!.getAttribute('title')).not.toBe(
      enLocales.posts.menu.publish,
    );
    // The inline warning shows the cannotPublishDraft wording. Pinned via an
    // apostrophe-free prefix: the component's inline `defaultValue` (what the
    // mock `t` returns) uses curly quotes while the JSON uses straight, so the
    // full string would differ on punctuation, not wording.
    expect(container!.innerHTML).toContain(
      'You no longer have permission to post at this draft',
    );
  });

  it('disabled-state strings are shipped in en and de', () => {
    const get = (loc: typeof enLocales, key: string) => {
      let cur: unknown = loc;
      for (const p of key.split('.'))
        cur = (cur as Record<string, unknown>)?.[p];
      return cur;
    };
    for (const key of [
      'posts.menu.cannotPublishDraft',
      'posts.menu.publishDisabled',
      'posts.menu.publish',
    ]) {
      expect(typeof get(enLocales, key)).toBe('string');
      expect(typeof get(deLocales, key)).toBe('string');
    }
  });

  // Publish failure contract (round-14 review item 2): web is
  // fire-and-forget — a rejecting `publishPostAction` must not throw through
  // the component (no toast today; RN routes failures into an error toast).
  // If web ever gains a publish toast, this case pins the parity entry point.
  // The real action is driven directly from the mock's captured handler; the
  // rejection is consumed here so it does not escape as an unhandled
  // rejection (the shipped code has no catch by design — that is the contract
  // under test, not a defect this test should mask).
  it('publish failure: a rejecting publishPostAction does not crash the menu', async () => {
    const button = publishButton(container!);
    expect(button).toBeTruthy();
    expect(button!.hasAttribute('disabled')).toBe(false);
    const publishAction = state.actions['Publish'];
    expect(publishAction).toBeDefined();
    state.publish.mockRejectedValueOnce(new Error('boom'));

    // Await the action's rejection explicitly: the component fires it without
    // a catch, so the test owns settling it.
    await expect(publishAction!()).rejects.toThrow('boom');
    expect(state.publish).toHaveBeenCalledWith(undefined);

    // The menu still renders (no error boundary, no throw).
    expect(publishButton(container!)).toBeTruthy();
  });
});
