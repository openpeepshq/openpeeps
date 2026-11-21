/** @vitest-environment jsdom */
/**
 * Regression tests for the web `ReactionPicker` orphaned-reaction path
 * (issue #276, round-5 review item #2). Orphans — reactions the profile
 * attached before the community removed the emoji from its allowed set — must
 * render dimmed after a divider and stay retractable; there must be no orphan
 * section when every attached reaction is still allowed.
 *
 * `@openpeepshq/react-ui` is stubbed so the popover content renders without a
 * portal; the real `ReactionButton` (and `lucide-react`) run, so the dimmed
 * `opacity-60` class and the orphan title are exercised as shipped.
 */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';

const mocks = vi.hoisted(() => ({
  allowed: ['👍', '🎉'] as readonly string[],
}));

vi.mock('../../../i18n', () => ({
  useT: () => (key: string) => key,
}));
vi.mock('../../../hooks/posts/useAllowedReactions', () => ({
  useAllowedReactions: () => mocks.allowed,
}));
vi.mock('../helpers', () => ({
  // Faithful to the real postReactionStats contract: "<unique emojis> <count>",
  // so the compact count assertion exercises the shipped text shape.
  postReactionStats: (post: { reactions?: Array<{ reaction: string }> }) => {
    const reactions = post.reactions ?? [];
    const uniqueEmojis = [...new Set(reactions.map((r) => r.reaction))].join(
      '',
    );
    return `${uniqueEmojis} ${reactions.length}`;
  },
}));
vi.mock('@openpeepshq/react-ui', () => ({
  Button: (props: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { disabled: props.disabled }, props.children),
  Popover: (props: { children?: ReactNode }) =>
    createElement('div', null, props.children),
  PopoverTrigger: (props: { children?: ReactNode }) =>
    createElement('span', null, props.children),
  PopoverContent: (props: { children?: ReactNode }) =>
    createElement('div', { 'data-testid': 'picker-content' }, props.children),
  cn: (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(' '),
}));

import { ReactionPicker } from './ReactionPicker';

let container: HTMLElement | undefined;
let root: Root | undefined;

const render = (
  myReactions: string[],
  onToggleReaction: () => void,
  post: { id: string; reactions?: Array<{ reaction: string }> } = {
    id: 'post-1',
    reactions: [],
  },
) => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const r = createRoot(el);
  act(() => {
    r.render(
      createElement(ReactionPicker, {
        post: post as PublicPost,
        myReactions,
        canReact: true,
        iReacted: false,
        onToggleReaction,
        compact: true,
      }),
    );
  });
  container = el;
  root = r;
  return el;
};

const orphanButton = (container: HTMLElement) =>
  container.querySelector('button[title="posts.actions.orphanedReaction"]');
const divider = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-testid="picker-content"] div')].find(
    (el) =>
      typeof el.className === 'string' &&
      el.className.includes('bg-border') &&
      el.getAttribute('aria-hidden') === 'true',
  );

describe('ReactionPicker (web) orphans', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = undefined;
    root = undefined;
  });

  it('renders the orphan dimmed after the divider', () => {
    const c = render(['🐰'], vi.fn());
    const orphan = orphanButton(c);
    expect(orphan).not.toBeNull();
    // The orphan is dimmed (the real ReactionButton applies opacity-60).
    expect(orphan!.className).toContain('opacity-60');
    // A divider precedes the orphan row.
    const d = divider(c);
    expect(d).toBeTruthy();
    // The orphan button is a later sibling of the divider inside the row.
    const row = c.querySelector('[data-testid="picker-content"] > div')!;
    const children = [...row.children];
    expect(children.indexOf(d as HTMLElement)).toBeLessThan(
      children.indexOf(orphan as HTMLElement),
    );
  });

  it('retracts when the orphan is tapped', () => {
    const onToggle = vi.fn();
    const c = render(['👍', '🐰'], onToggle);
    act(() => {
      orphanButton(c)!.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('🐰');
  });

  it('renders no orphan section when every attached reaction is allowed', () => {
    const c = render(['👍', '🎉'], vi.fn());
    expect(orphanButton(c)).toBeNull();
    expect(divider(c)).toBeFalsy();
  });
});

describe('ReactionPicker (web) compact trigger count (DM bubble, round-10 item #2)', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = undefined;
    root = undefined;
  });

  it('hides the count when the post has no reactions', () => {
    const c = render([], vi.fn(), { id: 'post-1', reactions: [] });
    // The trigger is just the icon — no "·" count text.
    expect(c.textContent).not.toContain('·');
  });

  it('shows the first emoji and count when reactions exist', () => {
    const c = render(['👍'], vi.fn(), {
      id: 'post-1',
      reactions: [{ reaction: '👍' }, { reaction: '🎉' }],
    });
    // Compact trigger: my first emoji (👍) · "👍🎉 2".
    expect(c.textContent).toContain('👍');
    expect(c.textContent).toContain('👍🎉 2');
  });
});
