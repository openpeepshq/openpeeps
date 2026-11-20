/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webNavHrefOf } from '../test/webNavHrefOf';
import { Welcome } from './Welcome';

const navigate = vi.fn();
const openNewPost = vi.fn();
let currentProfile: unknown = undefined;
let currentAccount: unknown = undefined;
let serverInfo: {
  publicContent?: boolean;
  communityConfig?: {
    info?: { privacyPolicy?: string; termsAndConditions?: string };
  };
} = {};

/** Shared mirror of the web navigator's target→path mapping (see
    test/webNavHrefOf.ts) so the test can assert each link's concrete
    destination; unmapped target types throw instead of rendering a
    silently-wrong href. */
const hrefOf = vi.fn(webNavHrefOf);

vi.mock('../index', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
  useHrefOf: () => hrefOf,
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePostsByProfile: () => ({
        data: { pages: [] },
        isPending: false,
        isSuccess: true,
      }),
      validationEmailAction: () => vi.fn().mockResolvedValue({ ok: true }),
    },
  }),
  useNewPostModal: () => ({ openNewPost }),
  useDefaultVisibility: () => 'public',
}));

vi.mock('../components', async () => {
  const React = await import('react');
  return {
    useCurrentProfile: () => currentProfile,
    useCurrentAccount: () => currentAccount,
    useServerInfo: () => ({
      publicContent: false,
      communityConfig: {},
      ...serverInfo,
    }),
    useToast: () => ({ success: vi.fn(), error: vi.fn() }),
    // Marker proving whether the checklist (the only thing gated behind the
    // posts query) is rendered. A guest must never hit it, because the
    // disabled profile query would spin forever.
    AccessDeniedLoader: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        'div',
        { 'data-testid': 'welcome-checklist-loader' },
        children,
      ),
  };
});

vi.mock('../lib/Markdown', () => ({
  Markdown: ({ source }: { source: string }) =>
    createElement('div', { 'data-testid': 'welcome-markdown' }, source),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) =>
    createElement('a', { href: to }, children),
}));

describe('Welcome', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    navigate.mockClear();
    openNewPost.mockClear();
    hrefOf.mockClear();
    currentProfile = undefined;
    currentAccount = undefined;
    serverInfo = {};
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(Welcome));
    });
    return container;
  };

  const linkByLabel = (el: Element, label: string) =>
    Array.from(el.querySelectorAll('a')).find((a) =>
      a.textContent?.includes(label),
    );

  it('renders a sign-in CTA and useful links for guests, without the spinning checklist loader', async () => {
    const el = await render();

    // Guest sees the heading and useful links directly.
    expect(el.querySelector('h1')).toBeTruthy();
    expect(el.textContent).toContain('Useful Links');
    expect(el.textContent).toContain('Sign in to complete your account setup');

    // The CTA points at the login page.
    const signInLink = linkByLabel(el, 'Sign In');
    expect(signInLink?.getAttribute('href')).toBe('/auth/login');

    // Useful links render as typed RouterLink destinations (the guest
    // default is a closed community: no public content).
    expect(linkByLabel(el, 'View documentation')?.getAttribute('href')).toBe(
      '/docs',
    );
    expect(
      linkByLabel(el, 'See all community members')?.getAttribute('href'),
    ).toBe('/members');
    expect(linkByLabel(el, 'Privacy policy')?.getAttribute('href')).toBe(
      '/docs/privacy',
    );
    expect(linkByLabel(el, 'Code of conduct')?.getAttribute('href')).toBe(
      '/code-of-conduct',
    );

    // Guests on a closed community must NOT get links that lead somewhere
    // broken: the local feed 401s for them and the profile page is blank.
    expect(linkByLabel(el, 'See community content')).toBeUndefined();
    expect(linkByLabel(el, 'Change your name, photo and bio')).toBeUndefined();

    // The bug: a guest must NOT be gated behind the checklist loader (a
    // disabled posts query would leave it pending forever).
    expect(
      el.querySelector('[data-testid="welcome-checklist-loader"]'),
    ).toBeNull();
    expect(el.textContent).not.toContain('Complete account setup');
    expect(
      el.querySelector('[data-testid="welcome-checklist-verify-email"]'),
    ).toBeNull();
  });

  it('shows the community link for guests only when content is public', async () => {
    serverInfo = { publicContent: true };

    const el = await render();

    expect(linkByLabel(el, 'See community content')?.getAttribute('href')).toBe(
      '/feeds/local',
    );
    expect(linkByLabel(el, 'Change your name, photo and bio')).toBeUndefined();
  });

  it('pins the terms-and-conditions anchor when configured, and omits it when not', async () => {
    // Configured: the community-configured URL renders as a raw new-tab
    // anchor (like the privacy link), not a same-tab SPA RouterLink.
    serverInfo = {
      communityConfig: {
        info: { termsAndConditions: 'https://terms.example.com/terms' },
      },
    };
    const el = await render();

    const termsLink = linkByLabel(el, 'Terms and conditions');
    expect(termsLink?.getAttribute('href')).toBe(
      'https://terms.example.com/terms',
    );
    expect(termsLink?.getAttribute('target')).toBe('_blank');
    expect(termsLink?.getAttribute('rel')).toBe('noopener noreferrer');

    // Not configured: the anchor is absent entirely.
    serverInfo = {};
    act(() => {
      root?.unmount();
    });
    const el2 = await render();
    expect(linkByLabel(el2, 'Terms and conditions')).toBeUndefined();
  });

  it('renders the setup checklist for signed-in users', async () => {
    currentProfile = {
      id: 'me1',
      avatar: 'a',
      bio: 'b',
      header: 'h',
      following: [],
    };
    currentAccount = { emailValidated: true };

    const el = await render();

    // Signed-in user gets the checklist inside the loader, not the guest CTA.
    expect(el.textContent).toContain('Complete account setup');
    expect(
      el.querySelector('[data-testid="welcome-checklist-loader"]'),
    ).toBeTruthy();
    expect(
      el.querySelector('[data-testid="welcome-checklist-verify-email"]'),
    ).toBeTruthy();
    expect(el.textContent).not.toContain(
      'Sign in to complete your account setup',
    );

    // The profile link is now shown (signed in) and points at the page the
    // label describes — public-profile, not the bare /settings shell.
    expect(
      linkByLabel(el, 'Change your name, photo and bio')?.getAttribute('href'),
    ).toBe('/settings/public-profile');
  });

  it('pins each checklist item to its destination or action', async () => {
    currentProfile = {
      id: 'me1',
      avatar: 'a',
      bio: 'b',
      header: 'h',
      following: [],
    };
    currentAccount = { emailValidated: true };

    const el = await render();

    const clickItem = (key: string) =>
      act(() => {
        const node = el.querySelector<HTMLElement>(
          `[data-testid="welcome-checklist-${key}"]`,
        );
        node?.click();
      });

    // "Add profile details" resolves through the same navigator mapping the
    // typed profile link uses — pinning the item→target mapping so a drifted
    // raw literal (or a changed mapping) is caught here.
    clickItem('profile-details');
    expect(hrefOf).toHaveBeenCalledWith({
      type: 'settings',
      section: 'public-profile',
    });
    expect(navigate).toHaveBeenCalledWith('/settings/public-profile');

    // "Connect with others" resolves through the same mapping the Useful
    // Links members link uses.
    clickItem('connect-with-others');
    expect(hrefOf).toHaveBeenCalledWith({ type: 'members' });
    expect(navigate).toHaveBeenCalledWith('/members');

    // "Make first post" opens the composer modal with the default
    // visibility instead of navigating anywhere.
    clickItem('make-post');
    expect(openNewPost).toHaveBeenCalledWith({ visibility: 'public' });
    expect(navigate).toHaveBeenCalledTimes(2);
  });
});
