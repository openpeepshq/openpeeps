/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PostCreationData,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { useArticleSlugField } from './postSlugField';

const slugCheck = vi.fn();
const client = { posts: { slugCheck, slugGenerate: vi.fn() } } as never;

const articleData = (slug: string): PostCreationData =>
  ({
    type: 'article',
    data: {
      type: 'article',
      content: 'body',
      ...(slug ? { slug } : {}),
    },
  }) as unknown as PostCreationData;

const profile = {} as ProfileWithMeta;

let hookResult: ReturnType<typeof useArticleSlugField> | undefined;
const Probe = ({
  data,
  onChange,
  articleId,
}: {
  data: PostCreationData;
  onChange: (d: PostCreationData) => void;
  articleId?: string;
}) => {
  hookResult = useArticleSlugField({
    postData: data,
    onChange,
    articleId,
    client,
    profile,
  });
  return null;
};

const mount = (
  data: PostCreationData,
  onChange = vi.fn(),
  articleId?: string,
) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(createElement(Probe, { data, onChange, articleId }));
  });
  return () => {
    act(() => root.unmount());
    container.remove();
  };
};

/** Advance the 300ms debounce and let the async check settle. */
const flushCheck = async () => {
  await act(async () => {
    vi.advanceTimersByTime(300);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  hookResult = undefined;
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useArticleSlugField', () => {
  it('re-checks availability on remount with the same slug + scope (no stale "taken")', async () => {
    // First mount: the slug is taken.
    slugCheck.mockResolvedValueOnce({ data: { available: false } });
    let unmount = mount(articleData('my-article'));
    await flushCheck();
    expect(hookResult!.status).toBe('taken');
    unmount();

    // Remount with the identical slug + scope. The check must run again
    // (availability may have changed since the first mount), and now the
    // slug is free.
    slugCheck.mockResolvedValueOnce({ data: { available: true } });
    unmount = mount(articleData('my-article'));
    await flushCheck();
    expect(slugCheck).toHaveBeenCalledTimes(2);
    expect(hookResult!.status).toBe('available');
    unmount();
  });

  it('passes excludePostId (the edited article id) to the availability check', async () => {
    slugCheck.mockResolvedValue({ data: { available: true } });
    const unmount = mount(
      articleData('my-article'),
      vi.fn(),
      '00000000-0000-0000-0000-000000000001',
    );
    await flushCheck();
    expect(slugCheck).toHaveBeenCalledWith({
      queryParameters: {
        slug: 'my-article',
        excludePostId: '00000000-0000-0000-0000-000000000001',
      },
    });
    unmount();
  });

  it('keeps the raw input while typing and normalizes on blur (trailing hyphen)', async () => {
    slugCheck.mockResolvedValue({ data: { available: true } });
    const unmount = mount(articleData(''), vi.fn());

    // Typing a trailing hyphen: the input keeps the raw value (a hyphen can
    // now be entered), so the field shows exactly what was typed.
    act(() => {
      hookResult!.setSlug('my-article-');
    });
    expect(hookResult!.slug).toBe('my-article-');

    // …but the availability check runs on the normalized (slugified) form,
    // which is what would be persisted.
    await flushCheck();
    expect(slugCheck).toHaveBeenLastCalledWith({
      queryParameters: { slug: 'my-article' },
    });

    // On blur, normalizeSlug snaps the input to the normalized slug.
    act(() => {
      hookResult!.normalizeSlug();
    });
    expect(hookResult!.slug).toBe('my-article');
    unmount();
  });
});
