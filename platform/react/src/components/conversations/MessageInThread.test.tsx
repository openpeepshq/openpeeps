/** @vitest-environment jsdom */
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost, PublicProfile } from '@openpeepshq/common/types';
import { MessageInThread } from './MessageInThread';

const { postViewRef } = vi.hoisted(() => ({
  postViewRef: { current: null as HTMLElement | null },
}));

vi.mock('../../lib/postViewCounter', () => ({
  usePostViewRef: () => postViewRef,
}));

vi.mock('../../i18n', () => {
  const translations: Record<string, string> = {
    'conversations.messageInThread.startedBy': 'Started by {{name}}',
    'conversations.messageInThread.addedBy': 'Added by {{name}}',
    'conversations.messageInThread.left': '{{name}} left',
    'conversations.messageInThread.removedBy': 'Removed by {{name}}',
  };
  return {
    useT: () => (key: string, opts?: Record<string, string>) =>
      (translations[key] ?? key).replace(
        /\{\{(\w+)\}\}/g,
        (_match: string, name: string) => opts?.[name] ?? '',
      ),
  };
});

vi.mock('../layout/IdentityContext', () => ({
  useCurrentProfile: () => undefined,
}));

vi.mock('../profile', () => ({
  Avatar: () => null,
}));

vi.mock('./ConversationMessageBubble', () => ({
  ConversationMessageBubble: () =>
    createElement('div', { 'data-testid': 'message-bubble' }, 'message bubble'),
}));

vi.mock('@openpeepshq/react-ui', () => ({
  UpdatingDate: () => createElement('time', null, 'a moment ago'),
}));

const bob: PublicProfile = {
  id: 'bob',
  displayName: 'Bob',
  handle: 'bob',
} as never;

const alice: PublicProfile = {
  id: 'alice',
  displayName: 'Alice',
  handle: 'alice',
} as never;

const post = (over: Partial<PublicPost> = {}): PublicPost =>
  ({
    id: 'post-1',
    profile: bob,
    audience: [alice, bob],
    createdAt: '2026-01-01T00:00:00.000Z',
    data: { type: 'note', content: 'hello' },
    ...over,
  }) as never;

describe('MessageInThread', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    postViewRef.current = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = (element: ReactElement) => {
    act(() => {
      root?.render(element);
    });
  };

  it('renders only the "left" label for a leave post and attaches the view ref to it', () => {
    render(
      createElement(MessageInThread, {
        previous: post({ id: 'prev-1' }),
        message: post({ inReplyToId: 'prev-1', audience: [alice] }),
      }),
    );
    expect(container?.textContent).toContain('Bob left');
    expect(container?.textContent).not.toContain('Added by');
    expect(container?.textContent).not.toContain('Removed by');
    expect(container?.querySelector('[data-testid=message-bubble]')).toBeNull();
    expect(postViewRef.current).not.toBeNull();
    expect(postViewRef.current?.textContent).toContain('Bob left');
  });

  it('renders a leave post as "left" even when it is the first loaded post', () => {
    render(
      createElement(MessageInThread, {
        previous: undefined,
        message: post({ inReplyToId: 'prev-1', audience: [alice] }),
      }),
    );
    expect(container?.textContent).toContain('Bob left');
    expect(container?.textContent).not.toContain('Added by');
    expect(container?.querySelector('[data-testid=message-bubble]')).toBeNull();
  });

  it('renders a root post outside its own audience as a message, not a leave', () => {
    render(
      createElement(MessageInThread, {
        previous: undefined,
        message: post({ audience: [alice] }),
      }),
    );
    expect(
      container?.querySelector('[data-testid=message-bubble]'),
    ).not.toBeNull();
    expect(container?.textContent).not.toContain('left');
  });

  it('renders a reply the author takes part in as a message', () => {
    render(
      createElement(MessageInThread, {
        previous: post({ id: 'prev-1' }),
        message: post({ inReplyToId: 'prev-1' }),
      }),
    );
    expect(
      container?.querySelector('[data-testid=message-bubble]'),
    ).not.toBeNull();
    expect(container?.textContent).not.toContain('Bob left');
  });
});
