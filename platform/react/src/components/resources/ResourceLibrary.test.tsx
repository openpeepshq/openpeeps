/** @vitest-environment jsdom */
import {
  act,
  createElement,
  useReducer,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceLibrary } from './ResourceLibrary';
import { RouterProvider, type RouterAdapter } from '../../contexts/router';

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePostsByType: () => ({
        data: { pages: [mockedPosts] },
        isPending: false,
      }),
      useCurrentProfileBookmarkedIds: () => ({ data: [] }),
    },
  }),
}));

vi.mock('../../hooks/useResolvedFeedFormat', () => ({
  useFeedListParams: () => ({ format: 'linear' }),
}));

// Rendered as each visible resource's title so a test can assert on which
// posts the filter kept (the real card is heavier than the test needs).
vi.mock('./ResourceCard', () => ({
  ResourceCard: ({
    post,
  }: {
    post: { id: string; data?: { title?: string } };
  }) =>
    createElement(
      'p',
      { 'data-testid': `card-${post.id}` },
      post.data?.title ?? post.id,
    ),
}));

const mockedPosts: Array<{
  id: string;
  type: 'resource';
  data?: { type: 'resource'; title?: string; categoryPath?: string[] };
}> = [];

interface FakeLocation {
  url: string;
  replaceWrites: number;
  pushWrites: number;
}

/**
 * RouterAdapter backed by a mutable URL, mimicking the real adapters:
 * `setSearchParams` rewrites only the query, keeping pathname and hash.
 */
const Harness = ({
  location,
  children,
}: {
  location: FakeLocation;
  children?: ReactNode;
}) => {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const url = new URL(location.url, 'http://localhost');
  const adapter: RouterAdapter = {
    pathname: url.pathname,
    searchParams: new URLSearchParams(url.search),
    setSearchParams: (next, opts) => {
      const resolved =
        typeof next === 'function'
          ? next(new URLSearchParams(url.search))
          : next;
      const query = resolved.toString();
      location.url =
        'http://localhost' +
        url.pathname +
        (query ? `?${query}` : '') +
        url.hash;
      if (opts?.replace) location.replaceWrites += 1;
      else location.pushWrites += 1;
      bump();
    },
    navigate: () => {},
    hrefOf: () => '#',
    match: () => null,
    back: () => {},
  };
  return createElement(RouterProvider, { adapter }, children);
};

describe('ResourceLibrary URL filters', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  const render = (ui: ReactElement) => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    container = el;
    root = createRoot(el);
    act(() => {
      root?.render(ui);
    });
    return el;
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    mockedPosts.length = 0;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    vi.useRealTimers();
  });

  it('keeps the tab hash and unrelated params when a filter changes', async () => {
    const location: FakeLocation = {
      url: 'http://localhost/groups/@x?category=Docs#resources',
      replaceWrites: 0,
      pushWrites: 0,
    };
    const container = render(
      createElement(
        Harness,
        { location },
        createElement(ResourceLibrary, { groupId: 'g1' }),
      ),
    );

    const fileButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'file',
    );
    expect(fileButton).toBeTruthy();

    await act(async () => {
      fileButton?.click();
    });
    // The URL write-back is debounced.
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // The hash (the group Resources tab) and ?category= survive the filter
    // change, and the write is a replace, not a new history entry.
    expect(location.url).toBe(
      'http://localhost/groups/@x?category=Docs&kind=file#resources',
    );
    expect(location.replaceWrites).toBe(1);
    expect(location.pushWrites).toBe(0);
  });

  it('hydrates filters from the URL on mount', async () => {
    const location: FakeLocation = {
      url: 'http://localhost/groups/@x?q=notes#resources',
      replaceWrites: 0,
      pushWrites: 0,
    };
    const container = render(
      createElement(
        Harness,
        { location },
        createElement(ResourceLibrary, { groupId: 'g1' }),
      ),
    );

    const search = container.querySelector(
      '[data-testid="resources-search"]',
    ) as HTMLInputElement | null;
    expect(search?.value).toBe('notes');
    // After the write-back window the state matches the URL, so a mount is
    // a no-op and must not rewrite it.
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(location.url).toBe('http://localhost/groups/@x?q=notes#resources');
    expect(location.replaceWrites).toBe(0);
  });
  describe('folder tree collision (issue #2148)', () => {
    const slashPost: (typeof mockedPosts)[number] = {
      id: 'p-slash',
      type: 'resource',
      data: {
        type: 'resource',
        title: 'Slash folder',
        categoryPath: ['[TEST] A/B'],
      },
    };
    const nestedPost: (typeof mockedPosts)[number] = {
      id: 'p-nested',
      type: 'resource',
      data: {
        type: 'resource',
        title: 'Nested folder',
        categoryPath: ['[TEST] A', 'B'],
      },
    };

    const renderLibrary = () => {
      mockedPosts.length = 0;
      mockedPosts.push(slashPost, nestedPost);
      const location: FakeLocation = {
        url: 'http://localhost/groups/@x#resources',
        replaceWrites: 0,
        pushWrites: 0,
      };
      return render(
        createElement(
          Harness,
          { location },
          createElement(ResourceLibrary, { groupId: 'g1' }),
        ),
      );
    };

    const showTree = async (container: HTMLDivElement) => {
      const toggle = [...container.querySelectorAll('button')].find(
        (button) => button.getAttribute('aria-label') === 'Show folder tree',
      );
      expect(toggle).toBeTruthy();
      await act(async () => {
        toggle?.click();
      });
      // The "All folders" pseudo-root starts collapsed; expand it.
      const expand = [...container.querySelectorAll('button')].find(
        (button) => button.getAttribute('aria-label') === 'Expand folder',
      );
      await act(async () => {
        expand?.click();
      });
    };

    const nameButton = (container: HTMLDivElement, label: string) =>
      [...container.querySelectorAll('button')].find((button) =>
        button.textContent?.startsWith(label),
      );

    it('renders two separate top-level nodes with counts of 1 each', async () => {
      const container = renderLibrary();
      await showTree(container);

      expect(nameButton(container, '[TEST] A/B(1)')).toBeTruthy();
      expect(nameButton(container, '[TEST] A(1)')).toBeTruthy();
      // Under the old join('/') keying both collapsed into one node of 2.
      expect(nameButton(container, '[TEST] A/B(2)')).toBeUndefined();
      expect(nameButton(container, '[TEST] A(2)')).toBeUndefined();
    });

    it('selects a slash-named folder without highlighting the nested one', async () => {
      const container = renderLibrary();
      await showTree(container);

      const slashNode = nameButton(container, '[TEST] A/B(1)');
      await act(async () => {
        slashNode?.click();
      });

      expect(nameButton(container, '[TEST] A/B(1)')?.className).toContain(
        'font-semibold',
      );
      // The selection filters the list to the slash-named folder's resource,
      // so the nested folder either disappears from the tree or stays
      // unhighlighted — it must never light up with the other one.
      const nested = nameButton(container, '[TEST] A(1)');
      expect(nested?.className ?? '').not.toContain('font-semibold');
    });

    it('expands the nested folder independently of the slash-named one', async () => {
      const container = renderLibrary();
      await showTree(container);

      expect(nameButton(container, 'B(1)')).toBeUndefined();

      // The chevron is the button right before the node-name button.
      const nestedNode = nameButton(container, '[TEST] A(1)');
      const chevron = nestedNode?.previousElementSibling as HTMLElement | null;
      expect(chevron).toBeTruthy();
      await act(async () => {
        chevron?.click();
      });

      expect(nameButton(container, 'B(1)')).toBeTruthy();
    });
  });

  it('keeps ?category= as a repeated param when other filters change', async () => {
    const location: FakeLocation = {
      url: 'http://localhost/resources?category=Docs&category=Q3',
      replaceWrites: 0,
      pushWrites: 0,
    };
    const container = render(
      createElement(
        Harness,
        { location },
        createElement(ResourceLibrary, { groupId: 'g1' }),
      ),
    );

    // The seeded folder is reflected in the breadcrumb, not the "All" reset.
    expect(container.textContent).toContain('Docs / Q3');

    const fileButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'file',
    );
    await act(async () => {
      fileButton?.click();
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Both segments survive as repeated params; category comes first so the
    // shared folder keeps its place when other filters change.
    expect(location.url).toBe(
      'http://localhost/resources?category=Docs&category=Q3&kind=file',
    );
    expect(location.replaceWrites).toBe(1);
  });

  it('writes the folder filter back to the URL when the breadcrumb resets', async () => {
    const location: FakeLocation = {
      url: 'http://localhost/resources?category=Docs&category=Q3',
      replaceWrites: 0,
      pushWrites: 0,
    };
    const container = render(
      createElement(
        Harness,
        { location },
        createElement(ResourceLibrary, { groupId: 'g1' }),
      ),
    );

    const resetButton = container.querySelector(
      '[data-testid="resources-category-reset"]',
    ) as HTMLButtonElement | null;
    expect(resetButton).toBeTruthy();
    await act(async () => {
      resetButton?.click();
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Resetting the folder removes the category params entirely.
    expect(location.url).toBe('http://localhost/resources');
    expect(location.replaceWrites).toBe(1);
  });

  it('treats an empty ?category= as no filter, not a hide-all', async () => {
    // A truncated/shared URL can carry a bare `?category=` with no value.
    mockedPosts.push(
      {
        id: 'p1',
        type: 'resource',
        data: {
          type: 'resource',
          title: 'Doc A',
          categoryPath: ['Docs', 'Q3'],
        },
      },
      {
        id: 'p2',
        type: 'resource',
        data: { type: 'resource', title: 'Doc B', categoryPath: ['Brand'] },
      },
    );
    const location: FakeLocation = {
      url: 'http://localhost/resources?category=',
      replaceWrites: 0,
      pushWrites: 0,
    };
    const container = render(
      createElement(
        Harness,
        { location },
        createElement(ResourceLibrary, { groupId: 'g1' }),
      ),
    );

    // The empty segment is dropped, so nothing is filtered out: both
    // resources stay visible instead of the grid blanking to an empty
    // `pathPrefix: ['']` that matches nothing.
    expect(container.querySelector('[data-testid="card-p1"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="card-p2"]')).toBeTruthy();

    // The write-back normalizes the empty param away, leaving a clean URL.
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(location.url).toBe('http://localhost/resources');
  });

  it('re-applies a folder deep-link while mounted without a redundant replace', async () => {
    const location: FakeLocation = {
      url: 'http://localhost/resources?category=Docs',
      replaceWrites: 0,
      pushWrites: 0,
    };
    const ui = () =>
      createElement(
        Harness,
        { location },
        createElement(ResourceLibrary, { groupId: 'g1' }),
      );
    const el = render(ui());

    // A new deep-link to a different folder arrives while the screen is
    // already mounted (an RN tab, the group resources tab, a web re-link).
    location.url = 'http://localhost/resources?category=Brand';
    await act(async () => {
      root?.render(ui());
    });

    // The library follows the new folder (the hook's re-apply effect).
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(el.textContent).toContain('Brand');
    // The state already matches the deep-linked URL, so the write-back is a
    // no-op: navigating to a different folder must not rewrite that entry.
    expect(location.replaceWrites).toBe(0);
    expect(location.url).toBe('http://localhost/resources?category=Brand');
  });
});
