/** @vitest-environment jsdom */
/**
 * Regression pin: the web avatar disc must be a **block-level** `flex`
 * container, never `inline-flex` (issue #1666). An `inline-flex` disc forms an
 * anonymous line box in its fixed-size parent and is aligned by baseline,
 * which drops the initials fallback lower than the image branch in the
 * member-selection chips.
 *
 * `getInitials` / `initialsBackground` run from real source; only
 * `useServerInfo` is stubbed, since it needs a live server context the jsdom
 * test lacks.
 */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { GroupData, PublicProfile } from '@openpeepshq/common/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server-data', () => ({
  useServerInfo: () => ({
    communityConfig: {
      theme: {
        light: { defaultProfileAvatar: null, defaultGroupAvatar: null },
        dark: { defaultProfileAvatar: null, defaultGroupAvatar: null },
      },
    },
  }),
}));

const { Avatar } = await import('./Avatar');
const { GroupAvatar } = await import('../groups/GroupAvatar');

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

const profile = (over: Partial<PublicProfile>): PublicProfile =>
  ({
    id: 'p1',
    handle: 'johndoe',
    displayName: 'John Doe',
    avatar: null,
    ...over,
  }) as PublicProfile;

/**
 * Render `el` and return the avatar disc container — the element that carries
 * both `overflow-hidden` and `rounded-full` (its fixed-size parent and the
 * initials span do not), i.e. the circle that must be centered as a
 * block-level flex. `content` is asserted to be a descendant of the returned
 * element, so the pin can only pass against the real disc, never against a
 * different `overflow-hidden rounded-full` div that a future change might
 * introduce earlier in document order.
 */
const renderDisc = (el: ReactNode, content: Element | null): HTMLDivElement => {
  act(() => {
    root.render(el);
  });
  const disc = Array.from(host.querySelectorAll('div')).find((d) => {
    const c = (d.className as string) ?? '';
    return c.includes('overflow-hidden') && c.includes('rounded-full');
  });
  expect(
    disc,
    'expected an avatar disc container to be rendered',
  ).toBeDefined();
  if (content) {
    expect(
      disc?.contains(content),
      'expected the disc to contain its own rendered content',
    ).toBe(true);
  }
  return disc as HTMLDivElement;
};

const classTokens = (el: Element) =>
  ((el.className as string) ?? '').split(/\s+/);

describe('Avatar disc container — block-level flex centering (issue #1666)', () => {
  it('is a block-level `flex`, not `inline-flex`, so the disc is not baseline-aligned on a line box', () => {
    const disc = renderDisc(
      createElement(Avatar, {
        profile: profile({}),
        size: 0.75,
        borderless: true,
      }),
      host.querySelector('span'),
    );
    const tokens = classTokens(disc);
    // The centering guarantee: block-level flex. Reverting to `inline-flex`
    // re-introduces the baseline line box that drops the initials disc toward
    // the chip's bottom border.
    expect(tokens).toContain('flex');
    expect(tokens).not.toContain('inline-flex');
  });

  it('image avatars sit on the same disc, so they are centered by the same block-level flex', () => {
    const disc = renderDisc(
      createElement(Avatar, {
        profile: profile({ avatar: 'https://example.com/avatar.png' }),
        size: 0.75,
        borderless: true,
      }),
      host.querySelector('img'),
    );
    const img = disc.querySelector('img');
    expect(img?.src).toBe('https://example.com/avatar.png');
    const tokens = classTokens(disc);
    expect(tokens).toContain('flex');
    expect(tokens).not.toContain('inline-flex');
  });

  it('renders the initials fallback (not an <img>) for a no-avatar profile, sized size/4', () => {
    act(() => {
      root.render(createElement(Avatar, { profile: profile({}), size: 0.75 }));
    });
    expect(host.querySelector('img')).toBeNull();
    const span = Array.from(host.querySelectorAll('span')).find(
      (s) => (s.textContent ?? '').length > 0,
    );
    expect(span?.textContent).toBe('JD');
    expect(span?.style.fontSize).toBe('0.1875rem');
  });
});

describe('GroupAvatar disc container — block-level flex centering (issue #1666)', () => {
  const group = (over: Partial<GroupData>): GroupData =>
    ({
      handle: 'team-alpha',
      displayName: 'Team Alpha',
      avatar: null,
      ...over,
    }) as GroupData;

  it('is a block-level `flex`, not `inline-flex` (web/native parity with the RN GroupAvatar)', () => {
    const disc = renderDisc(
      createElement(GroupAvatar, {
        group: group({}),
        size: 0.75,
        borderless: true,
      }),
      host.querySelector('span'),
    );
    const tokens = classTokens(disc);
    expect(tokens).toContain('flex');
    expect(tokens).not.toContain('inline-flex');
  });

  it('group image avatars sit on the same disc, so they are centered by the same block-level flex', () => {
    const disc = renderDisc(
      createElement(GroupAvatar, {
        group: group({ avatar: 'https://example.com/group.png' }),
        size: 0.75,
        borderless: true,
      }),
      host.querySelector('img'),
    );
    const img = disc.querySelector('img');
    expect(img?.src).toBe('https://example.com/group.png');
    const tokens = classTokens(disc);
    expect(tokens).toContain('flex');
    expect(tokens).not.toContain('inline-flex');
  });
});
