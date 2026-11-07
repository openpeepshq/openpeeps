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
      usePostsByType: () => ({ data: { pages: [[]] }, isPending: false }),
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
});
