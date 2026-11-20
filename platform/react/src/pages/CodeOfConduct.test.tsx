/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webNavHrefOf } from '../test/webNavHrefOf';
import { CodeOfConduct } from './CodeOfConduct';

const navigate = vi.fn();
/** Shared mirror of the web navigator's target→path mapping (see
    test/webNavHrefOf.ts); unmapped target types throw instead of
    rendering a silently-wrong href. */
const hrefOf = vi.fn(webNavHrefOf);

vi.mock('../index', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
  useHrefOf: () => hrefOf,
}));

vi.mock('../components', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'auth-layout' }, children),
}));

vi.mock('../hooks', () => ({
  useCommunityInfoPages: () => ({
    communityName: 'TestCo',
    aboutPage: 'About content',
    codeOfConduct: 'CoC content',
    showVisitorLinks: true,
    openRegistrations: false,
    publicContent: true,
  }),
}));

vi.mock('../lib/Markdown', () => ({
  Markdown: ({ source }: { source: string }) =>
    createElement('div', { 'data-testid': 'coc-markdown' }, source),
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Link: ({ action, children }: { action: string; children: React.ReactNode }) =>
    createElement('a', { href: action }, children),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) =>
    createElement('a', { href: to }, children),
}));

describe('CodeOfConduct', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    navigate.mockClear();
    hrefOf.mockClear();
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
      root?.render(createElement(CodeOfConduct));
    });
    return container;
  };

  const linkByLabel = (el: Element, label: string) =>
    Array.from(el.querySelectorAll('a')).find((a) =>
      a.textContent?.includes(label),
    );

  it('links "Explore the community" to the welcome page for guests', async () => {
    const el = await render();

    const exploreLink = linkByLabel(el, 'Explore the community');
    expect(exploreLink).toBeTruthy();
    expect(exploreLink?.getAttribute('href')).toBe('/welcome');
    expect(el.textContent).not.toContain('See community feed');
  });
});
