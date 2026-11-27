/**
 * Regression coverage for the RN generic post-edit page (`EditPost`, reached
 * from the post menu) passing `articleId` through to `ArticleForm`. Without it
 * the shared `useArticleSlugField` hook omits `excludePostId`, so the edited
 * article's own current slug is reported as "Taken" (and generate-on-blur can
 * suffix it). The dedicated `pages/articles/Edit.tsx` already passed
 * `articleId`; this test pins the generic path so it stays fixed.
 *
 * `EditPost` is a large composite, so every external import is mocked (node
 * jest env, no native modules) — mirroring New.carryover.test.tsx. `ArticleForm`
 * is stubbed to capture the props the page passes it; only that prop contract
 * is under test here (the `articleId` -> `excludePostId` behavior of the hook
 * itself is covered by postSlugField.test.tsx).
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';

const React = require('react');

// The edited article, as `openpeepsApi.usePost(id).data` returns it.
const ARTICLE_ID = '00000000-0000-0000-0000-000000000001';
const articlePost = {
  type: 'article',
  visibility: 'public',
  data: {
    type: 'article',
    title: 'My Article',
    content: 'article body',
    slug: 'my-article',
  },
};

// --- react-native: host elements render inert -------------------------------
jest.mock('react-native', () => ({
  ActivityIndicator: () => null,
}));

// --- i18n: resolve keys to their defaultValue -------------------------------
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}));

// --- shared @openpeepshq/react: post query + inert update action ------------
jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePost: () => ({ data: articlePost, isLoading: false }),
      updatePostAction: () => jest.fn(),
    },
  }),
}));

// --- common: the jest config pins the root import to contentLength.ts, which
//     lacks these exports, so the page's named imports resolve here. The
//     schema is an identity parse: the fixture is already a valid
//     PostCreationData, and only the articleId plumbing is under test. ------
jest.mock('@openpeepshq/common', () => ({
  postCreationDataSchema: { parse: (value: unknown) => value },
  pollOptionsWithinLimit: () => true,
  canSubmitPostContent: () => true,
  resolvePollOptionContents: (opts: string[]) => opts,
  visibleTextLength: (content?: string) => (content ?? '').length,
}));

// --- local react-native deps ------------------------------------------------
jest.mock('react-native-toast-message', () => {
  const Toast = { show: jest.fn() };
  return { __esModule: true, default: Toast };
});
jest.mock('react-hook-form', () => ({
  useForm: () => ({ reset: jest.fn() }),
}));
jest.mock('../../lib/post', () => ({
  hasProcessingAttachments: () => false,
}));

// --- layout + themed view: header inert, themed view passes children through
//     (so the article branch of the page body actually renders) --------------
jest.mock('../../components/layout', () => ({
  HeaderActionButton: () => null,
  useSetPageHeader: jest.fn(),
}));
jest.mock('../../components/ui/themed-view', () => ({
  ThemedView: ({ children }: { children?: ReactNode }) =>
    React.createElement('View', null, children),
}));

// --- article form: capture the props the page passes (the unit under test) --
let articleFormProps: Record<string, unknown> | undefined;
jest.mock('../../components/post/index', () => ({
  ArticleForm: (props: Record<string, unknown>) => {
    articleFormProps = props;
    return null;
  },
}));
jest.mock('../../components/post/post-form/PostForm', () => ({
  PostForm: () => null,
}));

import { EditPost } from './Edit';

function render(): void {
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      React.createElement(EditPost, {
        route: { params: { id: ARTICLE_ID } },
        navigation: { navigate: jest.fn() },
      })
    );
  });
}

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  articleFormProps = undefined;
});

test('EditPost passes articleId to ArticleForm when editing an article', () => {
  render();

  // The page reached the article branch and rendered ArticleForm…
  expect(articleFormProps).toBeDefined();
  // …and plumbed the post id through, so the slug field excludes the
  // article's own slug from availability checks.
  expect(articleFormProps?.articleId).toBe(ARTICLE_ID);
  expect(articleFormProps?.isEdit).toBe(true);
});
