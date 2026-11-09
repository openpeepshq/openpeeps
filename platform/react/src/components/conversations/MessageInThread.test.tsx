/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost, PublicProfile } from '@openpeepshq/common/types';
import { MessageInThread } from './MessageInThread';

const { ConversationMessageBubble } = vi.hoisted(() => ({
  ConversationMessageBubble: vi.fn(),
}));

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { name?: string }) =>
    key === 'conversations.messageInThread.left' ? `${opts?.name} left` : key,
}));
vi.mock('../../layout/IdentityContext', () => ({
  useCurrentProfile: () => undefined,
}));
vi.mock('../../lib/postViewCounter', () => ({
  usePostViewRef: () => null,
}));
vi.mock('../../lib/postUnread', () => ({
  isUnreadPostForViewer: () => false,
}));
vi.mock('@openpeepshq/react-ui', () => ({
  UpdatingDate: () => createElement('span', null, 'date'),
}));
vi.mock('../profile', () => ({
  Avatar: () => createElement('span', { 'data-testid': 'avatar' }),
}));
vi.mock('./ConversationMessageBubble', () => ({
  ConversationMessageBubble: (props: { message: PublicPost }) =>
    ConversationMessageBubble(props),
}));

const alice = { id: 'alice', handle: 'alice' } as unknown as PublicProfile;
const bob = { id: 'bob', handle: 'bob' } as unknown as PublicProfile;

const previous = {
  id: 'prev',
  profile: bob,
  audience: [alice, bob],
} as unknown as PublicPost;

const render = (ui: ReactNode) =>
  act(() => {
    root.render(ui);
  });

let root: Root;
let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  ConversationMessageBubble.mockReset();
  ConversationMessageBubble.mockReturnValue(
    createElement('div', { 'data-testid': 'bubble' }),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('MessageInThread', () => {
  it('renders only the left line (no bubble) for a leave post', () => {
    const leavePost = {
      id: 'leave',
      profile: alice,
      audience: [bob],
      inReplyToId: 'prev',
    } as unknown as PublicPost;
    render(<MessageInThread previous={previous} message={leavePost} />);
    expect(container.textContent).toContain('alice left');
    expect(container.textContent).not.toContain('date');
    expect(ConversationMessageBubble).not.toHaveBeenCalled();
  });

  it('renders the bubble without a left line for a normal post', () => {
    const normalPost = {
      id: 'normal',
      profile: alice,
      audience: [alice, bob],
      inReplyToId: 'prev',
    } as unknown as PublicPost;
    render(<MessageInThread previous={previous} message={normalPost} />);
    expect(container.textContent).not.toContain('alice left');
    expect(ConversationMessageBubble).toHaveBeenCalledTimes(1);
  });

  it('does not mark a post as left when the author was never in the audience', () => {
    const previousNoAlice = {
      ...previous,
      audience: [bob],
    } as unknown as PublicPost;
    const remotePost = {
      id: 'remote',
      profile: alice,
      audience: [bob],
      inReplyToId: 'prev',
    } as unknown as PublicPost;
    render(<MessageInThread previous={previousNoAlice} message={remotePost} />);
    expect(container.textContent).not.toContain('alice left');
    expect(ConversationMessageBubble).toHaveBeenCalledTimes(1);
  });
});
