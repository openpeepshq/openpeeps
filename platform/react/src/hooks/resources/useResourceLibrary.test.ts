/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResourceLibrary } from './useResourceLibrary';

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePostsByType: () => ({ data: { pages: [[]] }, isPending: false }),
      useCurrentProfileBookmarkedIds: () => ({ data: [] }),
    },
  }),
}));

vi.mock('../useResolvedFeedFormat', () => ({
  useFeedListParams: () => ({ format: 'linear' }),
}));

type Library = ReturnType<typeof useResourceLibrary>;

// The hook value of the currently-mounted probe, set during render so it is
// the freshest value once the surrounding `act` has flushed.
let latest: Library | undefined;

const Probe = ({ pathPrefix }: { pathPrefix?: string[] }) => {
  latest = useResourceLibrary(undefined, undefined, { pathPrefix });
  return null;
};

const mountProbe = (pathPrefix?: string[]) => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  const render = (seed?: string[]) => {
    act(() => {
      root.render(createElement(Probe, { pathPrefix: seed }));
    });
  };
  render(pathPrefix);
  return {
    render,
    get pathPrefix() {
      return latest!.pathPrefix;
    },
    setPathPrefix: (value: string[]) =>
      act(() => {
        latest!.setPathPrefix(value);
      }),
    unmount: () => {
      act(() => {
        root.unmount();
      });
      el.remove();
    },
  };
};

describe('useResourceLibrary category seeding', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    latest = undefined;
  });

  it('seeds pathPrefix from the initial filter', () => {
    const probe = mountProbe(['Docs', 'Q3']);
    expect(probe.pathPrefix).toEqual(['Docs', 'Q3']);
    probe.unmount();
  });

  it('re-applies when a different folder is seeded while mounted', () => {
    const probe = mountProbe(['Docs']);
    expect(probe.pathPrefix).toEqual(['Docs']);

    // A new category link arrives for a different folder while the screen is
    // still mounted (an RN tab, the group resources tab).
    probe.render(['Docs', 'Q3']);
    expect(probe.pathPrefix).toEqual(['Docs', 'Q3']);

    probe.render(['Brand']);
    expect(probe.pathPrefix).toEqual(['Brand']);
    probe.unmount();
  });

  it('keeps a filter the user chose when re-rendered with the same seed', () => {
    const probe = mountProbe(['Docs']);
    expect(probe.pathPrefix).toEqual(['Docs']);

    // The user picks a different folder in-session (local state change).
    probe.setPathPrefix(['Brand']);
    expect(probe.pathPrefix).toEqual(['Brand']);

    // A re-render with the unchanged seed (e.g. the URL write-back re-routed
    // the screen) must not restore the original folder.
    probe.render(['Docs']);
    expect(probe.pathPrefix).toEqual(['Brand']);
    probe.unmount();
  });
});
