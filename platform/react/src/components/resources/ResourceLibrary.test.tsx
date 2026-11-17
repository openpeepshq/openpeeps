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

const mockFeed = vi.hoisted(() => ({ posts: [] as unknown[] }));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePostsByType: () => ({
        data: { pages: [mockFeed.posts] },
        isPending: false,
      }),
      useCurrentProfileBookmarkedIds: () => ({ data: [] }),
    },
  }),
}));

vi.mock('../../hooks/useResolvedFeedFormat', () => ({
  useFeedListParams: () => ({ format: 'linear' }),
}));

vi.mock('./ResourceCard', () => ({
  ResourceCard: () => null,
}));

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
    const slashPost = {
      id: 'p-slash',
      type: 'resource',
      data: {
        type: 'resource',
        title: 'Slash folder',
        categoryPath: ['[TEST] A/B'],
      },
    };
    const nestedPost = {
      id: 'p-nested',
      type: 'resource',
      data: {
        type: 'resource',
        title: 'Nested folder',
        categoryPath: ['[TEST] A', 'B'],
      },
    };

    const renderLibrary = () => {
      mockFeed.posts = [slashPost, nestedPost];
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
});
