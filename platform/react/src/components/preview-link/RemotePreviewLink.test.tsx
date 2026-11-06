/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemotePreviewLink } from './RemotePreviewLink';

const state = {
  preview: {
    isLoading: false,
    data: {
      data: {
        title: 'Test video',
        description: 'A test video',
        image: 'https://example.com/thumb.jpg',
      },
    },
  },
  previewLinkCalls: [] as string[],
};

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePreviewLink: (url: string) => {
        state.previewLinkCalls.push(url);
        return state.preview;
      },
    },
  }),
}));

vi.mock('../../lib/analyticsClicks', () => ({
  recordOutboundClick: () => {},
}));

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const YOUTUBE_EMBED = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

describe('RemotePreviewLink', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state.preview = {
      isLoading: false,
      data: {
        data: {
          title: 'Test video',
          description: 'A test video',
          image: 'https://example.com/thumb.jpg',
        },
      },
    };
    state.previewLinkCalls = [];
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = (url: string) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(RemotePreviewLink, { url }));
    });
  };

  const click = async (element: Element) => {
    await act(async () => {
      element.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });
  };

  it('renders the link card for non-video URLs without a player', () => {
    render('https://example.com/article');
    const anchor = container?.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('https://example.com/article');
    expect(container?.textContent).toContain('Test video');
    expect(container?.querySelector('iframe')).toBeNull();
    expect(container?.querySelector('[role="button"]')).toBeNull();
  });

  it('shows the card with a play affordance for video URLs and no player yet', () => {
    render(YOUTUBE_URL);
    const play = container?.querySelector('[role="button"]');
    expect(play?.getAttribute('aria-label')).toBe('Play video');
    expect(container?.textContent).toContain('Test video');
    // The server-fetched OG card is the default view, so the preview
    // query stays enabled for embeddable URLs.
    expect(state.previewLinkCalls).toContain(YOUTUBE_URL);
    expect(container?.querySelector('iframe')).toBeNull();
  });

  it('mounts a sandboxed player only after the card is activated', async () => {
    render(YOUTUBE_URL);
    const play = container?.querySelector('[role="button"]');
    expect(play).toBeTruthy();

    await click(play!);

    const iframe = container?.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe(YOUTUBE_EMBED);
    expect(iframe?.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation',
    );
    expect(iframe?.getAttribute('allow')).toBe(
      'autoplay; encrypted-media; picture-in-picture; fullscreen',
    );
    expect(iframe?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(container?.querySelector('[role="button"]')).toBeNull();
  });

  it('mounts the player on Enter key', async () => {
    render(YOUTUBE_URL);
    const play = container?.querySelector('[role="button"]');
    expect(play).toBeTruthy();

    await act(async () => {
      play!.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(container?.querySelector('iframe')?.getAttribute('src')).toBe(
      YOUTUBE_EMBED,
    );
  });
});
