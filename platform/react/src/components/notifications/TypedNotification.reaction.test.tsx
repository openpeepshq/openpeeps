/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicNotification } from '@openpeepshq/common/types';
import { TypedNotification } from './TypedNotification';

const mocks = vi.hoisted(() => ({
  text: vi.fn(),
}));

vi.mock('@openpeepshq/common', () => ({
  profileName: () => 'Ada Lovelace',
  groupName: () => 'Community',
  AP_LIKE_REACTION: '👍',
}));

vi.mock('@openpeepshq/common/lib', () => ({
  isRsvpCancelNotice: () => false,
  isWaitlistOfferNotice: () => false,
  rsvpCancelWhenLabels: () => [],
  waitlistClaimPath: () => '',
}));

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: Record<string, unknown>) => {
    mocks.text(key, opts);
    const base = (opts?.defaultValue as string | undefined) ?? key;
    // Interpolate {{placeholders}} the way i18next would.
    return base.replace(/\{\{(\w+)\}\}/g, (m, name: string) =>
      String(opts?.[name] ?? m),
    );
  },
}));

vi.mock('./NotificationWrapper', () => ({
  NotificationWrapper: ({
    children,
  }: {
    profile: unknown;
    seen?: boolean;
    showProfile?: boolean;
    group?: unknown;
    children?: React.ReactNode;
  }) => createElement('div', { 'data-testid': 'wrapper' }, children),
}));

vi.mock('../conversations/ConversationMessageBubble', () => ({
  ConversationMessageBubble: () => null,
}));

vi.mock('../post/FeedPost', () => ({
  FeedPost: () => null,
}));

vi.mock('../post/types/event/CardEvent', () => ({
  CardEvent: () => null,
}));

vi.mock('../groups/GroupAvatar', () => ({
  GroupAvatar: () => null,
}));

vi.mock('@openpeepshq/react-ui', () => ({
  UpdatingDate: () => null,
}));

const reactionNotification = (reaction: string): PublicNotification =>
  ({
    id: 'n-1',
    type: 'reaction',
    data: { reaction },
    senderProfile: {
      id: 'p-1',
      displayName: 'Ada Lovelace',
      handle: 'ada',
    },
    post: { id: 'post-1' },
  }) as unknown as PublicNotification;

const renderNotification = (notification: PublicNotification) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(createElement(TypedNotification, { notification }));
  });
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

describe('TypedNotification reaction', () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.text.mockClear();
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it('displays the stored reaction emoji, not a hard-coded like', () => {
    const view = renderNotification(reactionNotification('❤️'));
    cleanup = view.cleanup;

    // The stored reaction is rendered verbatim, so a ❤️ reaction shows as
    // ❤️ (a hard-coded 👍🏽 fallback would fail this).
    expect(view.container.textContent).toContain('❤️');
    expect(view.container.textContent).not.toContain('👍🏽');
    expect(view.container.textContent).toContain('Ada Lovelace');
    expect(view.container.textContent).toContain('reacted to your post');
  });

  it('still displays the plain like for legacy 👍 reactions', () => {
    const view = renderNotification(reactionNotification('👍'));
    cleanup = view.cleanup;

    expect(view.container.textContent).toContain('👍');
  });

  it('falls back to the plain like for legacy notifications without a reaction', () => {
    const notification = reactionNotification('❤️');
    // Simulate an old notification whose payload never carried a reaction.
    notification.data = {} as never;
    const view = renderNotification(notification);
    cleanup = view.cleanup;

    expect(view.container.textContent).toContain('👍');
    expect(view.container.textContent).not.toContain('❤️');
  });
});
