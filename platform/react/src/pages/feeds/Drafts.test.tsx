/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  posts: [] as { id: string; data?: { content?: string } }[],
  feedProps: [] as {
    query: {
      data?: { pages: { id: string; data?: { content?: string } }[][] };
    };
  }[],
  headerCalls: [] as string[],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

vi.mock('lucide-react', () => ({ Search: () => null }));

vi.mock('../../index', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
  useOpenpeeps: () => ({
    openpeepsApi: {
      useMyDrafts: () => ({
        data: { pages: [state.posts] },
        refetch: vi.fn(),
      }),
    },
  }),
  useSetPageHeader: (label?: string) => {
    if (label) state.headerCalls.push(label);
  },
}));

vi.mock('../../components', () => ({
  Feed: (props: {
    query: {
      data?: { pages: { id: string; data?: { content?: string } }[][] };
    };
  }) => {
    state.feedProps.push(props);
    return createElement('div', { 'data-testid': 'feed' });
  },
}));

import { FeedsDrafts } from './Drafts';

const DRAFTS = [
  { id: 'd-1', data: { content: 'alpha draft' } },
  { id: 'd-2', data: { content: 'beta draft' } },
];

// The drafts feed wraps posts in pages (Post[][]); flatten to assert on posts.
const lastPosts = (): { id: string; data?: { content?: string } }[] => {
  const q = state.feedProps[state.feedProps.length - 1];
  return (q?.query.data?.pages ?? []).flat();
};

describe('FeedsDrafts', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state.posts = DRAFTS;
    state.feedProps = [];
    state.headerCalls = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders the author\u2019s drafts in the feed', () => {
    act(() => root.render(createElement(FeedsDrafts)));
    expect(state.headerCalls).toContain('Drafts');
    expect(lastPosts().map((p) => p.id)).toEqual(['d-1', 'd-2']);
  });

  it('filters the fetched pages client-side', async () => {
    act(() => root.render(createElement(FeedsDrafts)));

    const input = container.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, 'alpha');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(lastPosts().map((p) => p.id)).toEqual(['d-1']);

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, 'zzz');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(lastPosts()).toHaveLength(0);
  });
});
