/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePostsByType: () => ({ data: undefined, isLoading: false }),
      useCurrentProfileBookmarkedIds: () => ({ data: [] }),
    },
  }),
}));

vi.mock('../useResolvedFeedFormat', () => ({
  useFeedListParams: () => ({}),
}));

import {
  useResourceLibrary,
  type ResourceLibraryUrlState,
} from './useResourceLibrary';

const makeUrl = (
  initial: Record<string, string> = {},
): ResourceLibraryUrlState & { map: Map<string, string> } => {
  const map = new Map(Object.entries(initial));
  return {
    map,
    get: (name) => map.get(name) ?? null,
    set: (name, value) => {
      if (value === null) map.delete(name);
      else map.set(name, value);
    },
  };
};

const captured: {
  current: ReturnType<typeof useResourceLibrary> | null;
} = { current: null };

const Harness = ({ url }: { url?: ResourceLibraryUrlState }) => {
  captured.current = useResourceLibrary(undefined, undefined, url);
  return null;
};

describe('useResourceLibrary url-backed filters', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    captured.current = null;
  });

  const render = (url?: ResourceLibraryUrlState) =>
    act(() => {
      root?.render(createElement(Harness, { url }));
    });

  const lib = () => {
    if (!captured.current) throw new Error('harness not rendered');
    return captured.current;
  };

  it('initializes kind, tags and path from the URL', () => {
    render(makeUrl({ kind: 'file', tags: 'a,b', path: 'x/y' }));
    expect(lib().kind).toBe('file');
    expect(lib().selectedTags).toEqual(['a', 'b']);
    expect(lib().pathPrefix).toEqual(['x', 'y']);
  });

  it('falls back to defaults for invalid or missing URL values', () => {
    render(makeUrl({ kind: 'bogus' }));
    expect(lib().kind).toBe('all');
    expect(lib().selectedTags).toEqual([]);
    expect(lib().pathPrefix).toEqual([]);
  });

  it('writes kind changes to the URL and clears it for all', () => {
    const url = makeUrl();
    render(url);
    act(() => {
      lib().setKind('video');
    });
    expect(url.map.get('kind')).toBe('video');
    act(() => {
      lib().setKind('all');
    });
    expect(url.map.get('kind')).toBeUndefined();
  });

  it('writes tag toggles to the URL', () => {
    const url = makeUrl();
    render(url);
    act(() => {
      lib().toggleTag('b');
    });
    expect(url.map.get('tags')).toBe('b');
    act(() => {
      lib().toggleTag('a');
    });
    // tags keep insertion order
    expect(url.map.get('tags')).toBe('b,a');
    act(() => {
      lib().toggleTag('b');
    });
    expect(url.map.get('tags')).toBe('a');
    act(() => {
      lib().toggleTag('a');
    });
    expect(url.map.get('tags')).toBeUndefined();
  });

  it('writes path prefix changes to the URL', () => {
    const url = makeUrl();
    render(url);
    act(() => {
      lib().setPathPrefix(['x', 'y']);
    });
    expect(url.map.get('path')).toBe('x/y');
    act(() => {
      lib().setPathPrefix([]);
    });
    expect(url.map.get('path')).toBeUndefined();
  });

  it('works without a URL (composer and native callers)', () => {
    render();
    expect(lib().kind).toBe('all');
    expect(lib().selectedTags).toEqual([]);
    act(() => {
      lib().setKind('file');
    });
    expect(lib().kind).toBe('file');
    act(() => {
      lib().toggleTag('a');
    });
    expect(lib().selectedTags).toEqual(['a']);
  });
});
