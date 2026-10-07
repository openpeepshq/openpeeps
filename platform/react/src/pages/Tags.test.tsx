/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/layout/ToastProvider';
import { NewPostModalProvider } from '../components/post/post-form/NewPostModalContext';
import { pageHeaderStore, usePageHeader } from '../stores/pageHeader';
import { Tags } from './Tags';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ hashtag: 'juneteenth' }),
}));

vi.mock('../hooks', () => ({
  useFeedListParams: () => ({ format: 'linear' }),
}));

// The real plus-button hook subscribes to the new-post modal. That provider
// sits above the page and re-renders whenever the page header changes.
vi.mock('../components', async () => {
  const { useNewPostModal } = await import(
    '../components/post/post-form/NewPostModalContext'
  );
  return {
    Feed: () => createElement('div', { 'data-testid': 'hashtag-feed' }),
    useDefaultVisibility: () => 'local',
    useNewNotePlusButton: () => {
      useNewPostModal();
    },
  };
});

vi.mock('../index', async () => {
  const { useSetPageHeader } = await import('../stores/pageHeader');
  const profile = { id: 'profile-1', followedHashtags: [] };
  const t = (key: string, opts?: { defaultValue?: string; hashtag?: string }) =>
    (opts?.defaultValue ?? key).replaceAll('{{hashtag}}', opts?.hashtag ?? '');
  return {
    useT: () => t,
    useOpenpeeps: () => ({
      openpeepsApi: {
        usePostsByHashtag: () => ({ isLoading: false }),
        followHashtagAction: () => async () => undefined,
        unfollowHashtagAction: () => async () => undefined,
      },
    }),
    useSetPageHeader,
    useCurrentProfile: () => profile,
  };
});

const Shell = ({ children }: { children: ReactNode }) => {
  const header = usePageHeader();
  const title = typeof header?.title === 'string' ? header.title : '';
  return createElement(
    ToastProvider,
    null,
    createElement(
      NewPostModalProvider,
      null,
      createElement('h1', null, title),
      header?.actions,
      children,
    ),
  );
};

describe('Tags page', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    pageHeaderStore.set(undefined);
    root = undefined;
    container = undefined;
  });

  it('renders a signed-in hashtag page without looping on the header', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(Shell, null, createElement(Tags)));
    });

    expect(container.querySelector('h1')?.textContent).toBe('#juneteenth');
    expect(container.querySelector('button')?.textContent).toContain(
      'Follow hashtag',
    );
    expect(
      container.querySelector('[data-testid="hashtag-feed"]'),
    ).toBeTruthy();
  });
});
