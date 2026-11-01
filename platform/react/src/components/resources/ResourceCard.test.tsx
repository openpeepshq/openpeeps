/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import { ResourceCard } from './ResourceCard';

const navigate = vi.fn();

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useCurrentProfileBookmarkedIds: () => ({ data: [] }),
      bookmarkPostAction: () => async () => undefined,
      unbookmarkPostAction: () => async () => undefined,
    },
  }),
}));

vi.mock('../layout/IdentityContext', () => ({
  useCurrentProfile: () => undefined,
}));

vi.mock('../../contexts/router', () => ({
  useNavigate: () => navigate,
  useHrefOf: () => () => '#',
}));

vi.mock('../post/TruncatedMarkdown', () => ({
  TruncatedMarkdown: () => null,
}));

vi.mock('../post/VideoPlayOverlay', () => ({
  VideoPlayOverlay: () => null,
}));

const resourcePost = (tags: string[]): PublicPost =>
  ({
    id: 'post-1',
    type: 'resource',
    data: {
      type: 'resource',
      title: 'Guide',
      resourceKind: 'link',
      url: 'https://example.com',
      tags,
    },
  }) as PublicPost;

const filePost = (): PublicPost =>
  ({
    id: 'post-file',
    type: 'resource',
    data: {
      type: 'resource',
      title: 'Quarterly report',
      resourceKind: 'file',
      attachments: [
        {
          type: 'file',
          url: 'https://cdn.example.com/report.pdf',
          filename: 'report.pdf',
          meta: { size: 2500000, mimetype: 'application/pdf' },
        },
      ],
    },
  }) as PublicPost;

describe('ResourceCard', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    navigate.mockClear();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('navigates to the tag page when a hashtag chip is clicked', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        createElement(ResourceCard, { post: resourcePost(['Juneteenth']) }),
      );
    });

    const chip = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === '#juneteenth',
    );
    expect(chip).toBeTruthy();

    await act(async () => {
      chip?.click();
    });

    expect(navigate).toHaveBeenCalledWith({
      type: 'tags',
      hashtag: 'juneteenth',
    });
  });

  it('shows the filename with its extension for a file resource', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(ResourceCard, { post: filePost() }));
    });

    // filename + extension, followed by the formatted size
    expect(container.textContent).toContain('report.pdf');
    expect(container.textContent).toContain('2.4 MB');
  });
});
