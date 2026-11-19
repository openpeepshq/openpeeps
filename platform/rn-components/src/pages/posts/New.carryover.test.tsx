/**
 * Regression coverage for #1799 (native composer) — the poll <-> note type
 * switch must carry the typed text over *and* persist the converted draft to
 * the app-lifetime local post store, so the carry-over (including the
 * `questionDraft` stash that lets a later note -> poll restore the original
 * poll) survives a screen unmount/remount.
 *
 * The native `NewPost` is a large composite, so every external import is
 * mocked (node jest env, no native modules) — mirroring FullEvent.test.tsx.
 * Only `handleSelectComposerType` is exercised; the surrounding form / footer
 * / picker UI render inert mocks. The shared `toNote`/`toQuestion`/
 * `isSwitchablePostData` helpers are loaded from `@openpeepshq/react`'s
 * real source so the conversion logic under test is the production one.
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';

const React = require('react');

// Shared helper (the production conversion logic) resolved from the real
// react package source. The jest moduleNameMapper only pins the package
// *root* import to contentLength; this explicit subpath keeps real toNote /
// toQuestion / isSwitchablePostData in the test.
const mockSharedPost = require('../../../../react/src/lib/post');

// --- react-native: host elements render as plain host tags ----------------
jest.mock('react-native', () => {
  const make = (tag: string) => (props: { children?: ReactNode }) =>
    React.createElement(tag, null, props.children);
  return { View: make('View'), Text: make('Text') };
});

// --- i18n: resolve keys to their defaultValue -----------------------------
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string; number?: number }) =>
      opts?.defaultValue ?? _key,
  }),
}));

// --- shared @openpeepshq/react: real conversion helpers, inert context ----
jest.mock('@openpeepshq/react', () => ({
  isSwitchablePostData: mockSharedPost.isSwitchablePostData,
  toNote: mockSharedPost.toNote,
  toQuestion: mockSharedPost.toQuestion,
  useOpenpeeps: () => ({
    currentProfile: { id: 'me', roles: [] },
    openpeepsApi: {
      createPostAction: () => jest.fn(),
      admin: { announcePostAction: () => jest.fn() },
      joinGroupAction: () => jest.fn(),
      useServerInfo: () => ({ data: { publicContent: true } }),
    },
  }),
}));

// --- common: the jest config pins the root import to contentLength.ts, which
//     lacks these runtime helpers, so the page's named imports resolve here. --
jest.mock('@openpeepshq/common', () => ({
  POLL_DEFAULT_EXPIRY_MS: 30 * 24 * 60 * 60 * 1000,
  canAnnouncePosts: () => false,
  isCommunityWideVisibility: () => true,
  pollOptionsWithinLimit: () => true,
  canSubmitPostContent: () => true,
  resolvePollOptionContents: (opts: string[]) => opts,
  visibleTextLength: (c?: string) => (c ?? '').length,
}));

// --- navigation: types are type-only, but the stack barrel is stubbed ------
jest.mock('@react-navigation/native', () => ({}));
jest.mock('@react-navigation/native-stack', () => ({}));

// --- local react-native deps ----------------------------------------------
jest.mock('react-native-toast-message', () => {
  const Toast = { show: jest.fn() };
  return { __esModule: true, default: Toast };
});
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: () => null,
}));
jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: ({ children }: { children?: ReactNode }) =>
    React.createElement('View', null, children),
}));

// --- react-hook-form: inert form, capturing reset() calls -----------------
let formResetCalls: unknown[][] = [];
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    reset: (v?: unknown) => {
      formResetCalls.push([v]);
    },
  }),
}));

// --- media permissions: always allowed (picker paths are inert) -----------
jest.mock('../../lib/media-permissions', () => ({
  checkMediaPermissions: () => Promise.resolve(true),
}));

// --- layout + themed view: render inert ------------------------------------
jest.mock('../../components/layout', () => ({
  HeaderActionButton: () => null,
  useSetPageHeader: jest.fn(),
}));
jest.mock('../../components/ui/themed-view', () => ({
  ThemedView: ({ children }: { children?: ReactNode }) =>
    React.createElement('View', null, children),
}));

// --- picker sheets + article form: render inert ----------------------------
jest.mock('../../components/custom/index', () => ({
  ImagePickerSheet: () => null,
  AudioPickerSheet: () => null,
  DocumentPickerSheet: () => null,
}));
jest.mock('../../components/post/index', () => ({
  ArticleForm: () => null,
}));

// --- composer children: PostForm inert, PostTypeSwitcher forwards onSelect -
let switcherOnSelect: ((type: 'note' | 'question') => void) | undefined;
jest.mock('../../components/post/post-form/PostForm', () => ({
  PostForm: () => null,
}));
jest.mock('../../components/post/post-form/PostTypeSwitcher', () => ({
  PostTypeSwitcher: (props: {
    type: string;
    onSelect: (type: 'note' | 'question') => void;
  }) => {
    switcherOnSelect = props.onSelect;
    return React.createElement('View', null);
  },
}));
jest.mock('../../components/post/post-form/Footer', () => ({
  // Renders the `typeSwitcher` slot so PostTypeSwitcher mounts and captures its
  // onSelect (New.tsx passes the switcher as a prop, not a child).
  Footer: (props: { typeSwitcher?: ReactNode }) =>
    React.createElement('View', null, props.typeSwitcher),
}));

import { useLocalPostStore } from '../../stores/useLocalPostStore';
import { NewPost } from './New';

const NOTE_DRAFT = {
  type: 'note',
  visibility: 'public' as const,
  data: { type: 'note' as const, content: '[TEST] note text before poll' },
  mentions: [],
};

const QUESTION_DRAFT = {
  type: 'question',
  visibility: 'public' as const,
  data: {
    type: 'question' as const,
    content: '[TEST] poll question',
    options: [
      { type: 'note' as const, content: 'Option A' },
      { type: 'note' as const, content: 'Option B' },
    ],
    expiresAt: '2026-12-31T18:00:00.000Z',
  },
  mentions: [],
};

function render(): ReactTestRenderer.ReactTestRenderer {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <NewPost route={{ params: {} }} navigation={{}} />
    );
  });
  return tree;
}

function clickSwitchTo(type: 'note' | 'question'): void {
  expect(switcherOnSelect).toBeDefined();
  ReactTestRenderer.act(() => {
    switcherOnSelect!(type);
  });
}

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  useLocalPostStore.getState().resetPostData();
  useLocalPostStore.setState({
    postData: QUESTION_DRAFT,
    replyData: {},
  });
  formResetCalls = [];
  switcherOnSelect = undefined;
});

test('poll -> note persists a note draft carrying the questionDraft stash', () => {
  render();
  clickSwitchTo('note');

  // The converted draft is written to the app-lifetime local post store — the
  // remount-restore path the screen comments rely on.
  const stored = useLocalPostStore.getState().postData;
  expect(stored.data).toMatchObject({
    type: 'note',
    content: '[TEST] poll question',
  });
  // The stash carries the poll's structural fields so a later note -> poll
  // restores them instead of rebuilding a blank poll.
  expect(stored.questionDraft).toMatchObject({
    options: [
      { type: 'note', content: 'Option A' },
      { type: 'note', content: 'Option B' },
    ],
    expiresAt: '2026-12-31T18:00:00.000Z',
  });
  // The form is reset to the same converted draft (the handler passes one
  // object to both form.reset and setPostData).
  expect(formResetCalls.length).toBeGreaterThan(0);
  const formNote = formResetCalls
    .map((c) => c[0])
    .find((p) => (p as { data?: { type?: string } })?.data?.type === 'note');
  expect(formNote).toBe(stored);
});

test('note -> poll converts the note into a poll and drops the questionDraft stash', () => {
  useLocalPostStore.setState({
    postData: NOTE_DRAFT,
    replyData: {},
  });
  render();
  clickSwitchTo('question');

  const stored = useLocalPostStore.getState().postData;
  expect(stored.data).toMatchObject({
    type: 'question',
    content: '[TEST] note text before poll',
    options: [
      { type: 'note', content: '' },
      { type: 'note', content: '' },
    ],
  });
  // A note -> poll conversion has no stash to carry, so no questionDraft.
  expect(stored.questionDraft).toBeUndefined();
});
