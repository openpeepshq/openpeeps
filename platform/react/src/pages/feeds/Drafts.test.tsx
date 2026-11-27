/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  posts: [] as {
    id: string;
    data?: { content?: string; title?: string; name?: string };
  }[],
  feedProps: [] as {
    query: {
      data?: {
        pages: {
          id: string;
          data?: { content?: string; title?: string; name?: string };
        }[][];
      };
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
      data?: {
        pages: {
          id: string;
          data?: { content?: string; title?: string; name?: string };
        }[][];
      };
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
  { id: 'd-3', data: { name: 'Summer Jam Kickoff' } },
  { id: 'd-4', data: { title: 'Onboarding deep-dive' } },
];

// The drafts feed wraps posts in pages (Post[][]); flatten to assert on posts.
const lastPosts = (): {
  id: string;
  data?: { content?: string; title?: string; name?: string };
}[] => {
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
    expect(lastPosts().map((p) => p.id)).toEqual(['d-1', 'd-2', 'd-3', 'd-4']);
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

  it('matches the event name and article title, not just the content', async () => {
    act(() => root.render(createElement(FeedsDrafts)));

    const input = container.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;
    const type = (value: string) =>
      act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

    // A draft with a name and no content is found by the name.
    await type('kickoff');
    expect(lastPosts().map((p) => p.id)).toEqual(['d-3']);

    // …and one with a title and no content is found by the title.
    await type('onboarding');
    expect(lastPosts().map((p) => p.id)).toEqual(['d-4']);

    // Content still matches too (and the fields are joined, so no field
    // boundary can hide a match).
    await type('beta');
    expect(lastPosts().map((p) => p.id)).toEqual(['d-2']);
  });
});
