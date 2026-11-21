/** @vitest-environment jsdom */
/**
 * Regression test for DM-bubble reaction wiring (issue #276, round-5 review
 * item #2): the bubble must feed the picker the profile's reactions and the
 * reaction permission, and route the picker's toggle through
 * `usePostReactionToggle`. Mirrors the web feed-post wiring that was already
 * exercised; without this, a DM bubble could silently drop the picker or call
 * the toggle with the wrong emoji.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';

const mocks = vi.hoisted(() => ({
  toggle: vi.fn(async () => {}),
  canReact: true,
  myReactions: ['👍'],
}));

vi.mock('../../i18n', () => ({
  useT: () => (key: string) => key,
}));
vi.mock('../../hooks/posts/usePostReactionToggle', () => ({
  usePostReactionToggle: () => ({
    iReacted: false,
    myReactions: mocks.myReactions,
    canReact: mocks.canReact,
    toggleReaction: mocks.toggle,
  }),
}));
vi.mock('../layout/IdentityContext', () => ({
  useCurrentProfile: () => ({ id: 'me-1' }),
}));
vi.mock('../post/FeedPostContent', () => ({
  FeedPostContent: () => null,
}));
vi.mock('../post/pieces/UnreadPostIndicator', () => ({
  UnreadPostIndicator: () => null,
}));

let pickerProps: Record<string, unknown> | undefined;
vi.mock('../post/pieces/ReactionPicker', () => ({
  ReactionPicker: (props: Record<string, unknown>) => {
    pickerProps = props;
    return null;
  },
}));

import { ConversationMessageBubble } from './ConversationMessageBubble';

const message = {
  id: 'post-1',
  profile: { id: 'other-1' },
} as unknown as PublicPost;

describe('ConversationMessageBubble (web) reaction wiring', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.canReact = true;
    mocks.myReactions = ['👍'];
    mocks.toggle.mockClear();
    pickerProps = undefined;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = undefined;
    root = undefined;
  });

  it('feeds the picker the profile reactions and routes the toggle', () => {
    act(() => {
      root!.render(createElement(ConversationMessageBubble, { message }));
    });
    expect(pickerProps).toBeDefined();
    expect(pickerProps!.myReactions).toEqual(['👍']);
    expect(pickerProps!.canReact).toBe(true);

    act(() => {
      (pickerProps!.onToggleReaction as (reaction: string) => void)('🎉');
    });
    expect(mocks.toggle).toHaveBeenCalledTimes(1);
    expect(mocks.toggle).toHaveBeenCalledWith('🎉');
  });

  it('renders no picker when the profile cannot react', () => {
    mocks.canReact = false;
    act(() => {
      root!.render(createElement(ConversationMessageBubble, { message }));
    });
    expect(pickerProps).toBeUndefined();
  });
});
