/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import { REACTION_TYPES } from '@openpeepshq/common';
import { ReactionPicker } from './ReactionPicker';

const onToggleMock = vi.hoisted(() => vi.fn());

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Button: ({
    children,
    className,
    title,
    disabled,
  }: {
    children?: ReactNode;
    className?: string;
    title?: string;
    disabled?: boolean;
  }) => createElement('button', { className, title, disabled }, children),
  // Render both the trigger and the content eagerly so the picker row can be
  // asserted without driving the real popover's open state.
  Popover: ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children),
  PopoverTrigger: ({ children }: { children?: ReactNode }) =>
    createElement('span', { 'data-testid': 'reaction-trigger' }, children),
  PopoverContent: ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-testid': 'reaction-content' }, children),
  cn: (...parts: Array<string | false | null | undefined>) =>
    parts.filter(Boolean).join(' '),
}));

const makePost = (): PublicPost =>
  ({ id: 'post-1', reactions: [] }) as unknown as PublicPost;

const renderPicker = (
  props?: Partial<Parameters<typeof ReactionPicker>[0]>,
) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(
      createElement(ReactionPicker, {
        post: makePost(),
        myReactions: [],
        canReact: true,
        iReacted: false,
        onToggleReaction: (reaction: string) => onToggleMock(reaction),
        ...props,
      }),
    );
  });

  const content = () =>
    container.querySelector('[data-testid="reaction-content"]')!;
  const emojiButton = (emoji: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === emoji,
    );

  return {
    content,
    emojiButton,
    triggerButton: () =>
      container.querySelector<HTMLButtonElement>(
        '[data-testid="reaction-trigger"] button',
      ),
    closeButton: () =>
      container.querySelector<HTMLButtonElement>(
        '[aria-label="posts.actions.closeReactionPicker"]',
      ),
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

describe('ReactionPicker (web)', () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    onToggleMock.mockClear();
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it('shows exactly the curated reactions plus a close affordance', () => {
    const view = renderPicker();
    cleanup = view.cleanup;

    const buttons = view.content().querySelectorAll('button');
    // 7 curated emojis + the explicit close button (the web picker's
    // counterpart to the RN picker's ✕).
    expect(buttons.length).toBe(REACTION_TYPES.length + 1);
    for (const emoji of REACTION_TYPES) {
      expect(view.content().textContent).toContain(emoji);
    }
  });

  it('highlights the reactions the current profile already attached', () => {
    const view = renderPicker({ myReactions: ['❤️'] });
    cleanup = view.cleanup;

    expect(view.emojiButton('❤️')!.className).toContain('bg-border');
    expect(view.emojiButton('👍')!.className).not.toContain('bg-border');
  });

  it('calls onToggleReaction with the tapped emoji', () => {
    const view = renderPicker();
    cleanup = view.cleanup;

    const tapped = view.emojiButton('😂')!;
    act(() => {
      tapped.click();
    });

    expect(onToggleMock).toHaveBeenCalledTimes(1);
    expect(onToggleMock).toHaveBeenCalledWith('😂');
  });

  it('gives each emoji button a title with the reaction name', () => {
    const view = renderPicker();
    cleanup = view.cleanup;

    for (const emoji of REACTION_TYPES) {
      expect(view.emojiButton(emoji)!.title).toBe(emoji);
    }
  });

  it('exposes an explicit close affordance labelled closeReactionPicker', () => {
    const view = renderPicker();
    cleanup = view.cleanup;

    const close = view.closeButton();
    expect(close).not.toBeNull();
    expect(close!.getAttribute('aria-label')).toBe(
      'posts.actions.closeReactionPicker',
    );
  });

  it('disables the trigger when the profile cannot react and has no reactions', () => {
    const view = renderPicker({ canReact: false, myReactions: [] });
    cleanup = view.cleanup;

    const trigger = view.triggerButton()!;
    expect(trigger.disabled).toBe(true);
  });
});
