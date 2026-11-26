/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { JamEvent } from '@openpeepshq/common/types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JamChatMessage } from './JamChatMessage';

// Web pin for the dedicated `kicked` chat-message branch (issue #303
// round-15 suggestion 1). `kicked` was added to the attendance-event union in
// `jamEventDataSchema`, but `JamChatMessage` deliberately keeps it OUT of the
// `attendance` array so this branch (profile name + `jams.chat.wasRemoved`)
// runs instead of the generic attendance renderer. A future edit that adds
// `kicked` to that array — or reorders the branches — would silently degrade
// the message to the generic "X kicked the jam" output; these render tests
// pin the dedicated copy so that regression fails here.
const en = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../../i18n/src/locales/en.json'),
    'utf8',
  ),
) as Record<string, unknown>;

const lookup = (key: string): string | undefined => {
  let cur: unknown = en;
  for (const part of key.split('.')) {
    cur =
      cur && typeof cur === 'object'
        ? (cur as Record<string, unknown>)[part]
        : undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
};

const h = vi.hoisted(() => ({
  profile: {
    value: undefined as
      | { id: string; displayName: string; handle: string }
      | undefined,
  },
  loading: { value: false },
}));

// The DropdownMenu primitives are rendered by the delete affordance. Mock them
// as thin passthroughs so the real `<button>` trigger and the menu item (which
// carries `onSelect`) are reachable without pulling in the radix runtime.
vi.mock('@openpeepshq/react-ui', async () => {
  const React = await import('react');
  return {
    UpdatingDate: () => null,
    DropdownMenu: ({ children }: { children?: unknown }) =>
      (children ?? null) as unknown as React.ReactElement,
    DropdownMenuTrigger: ({ children }: { children?: unknown }) =>
      (children ?? null) as unknown as React.ReactElement,
    DropdownMenuContent: ({ children }: { children?: unknown }) =>
      (children ?? null) as unknown as React.ReactElement,
    DropdownMenuItem: (props: {
      children?: unknown;
      onSelect?: (e: unknown) => void;
      className?: string;
    }) =>
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'delete-item',
          onClick: () => props.onSelect?.({ preventDefault: () => {} }),
        },
        (props.children ?? null) as React.ReactNode,
      ),
  };
});

vi.mock('../markdown/OpenpeepsMarkdown', () => ({
  OpenpeepsMarkdown: () => null,
}));

vi.mock('../profile/Avatar', () => ({
  Avatar: () => null,
}));

// The real shipped locale, so the rendered copy pins the value the user
// actually sees — a renamed `jams.chat.wasRemoved` key breaks here.
vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    lookup(key) ?? opts?.defaultValue ?? key,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useProfile: () => ({
        data: h.profile.value,
        isLoading: h.loading.value,
      }),
    },
  }),
}));

const baseMessage = {
  id: 'evt-1',
  jamId: 'jam-1',
  profileId: 'kicked-1',
  createdAt: '2026-11-22T20:00:00.000Z',
  updatedAt: '2026-11-22T20:00:00.000Z',
} as Pick<JamEvent, 'id' | 'jamId' | 'profileId' | 'createdAt' | 'updatedAt'>;

const renderMessage = (message: JamEvent, onDelete?: () => void) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  act(() => {
    root = createRoot(container);
    root.render(<JamChatMessage message={message} onDelete={onDelete} />);
  });
  return {
    container,
    unmount: () => {
      act(() => {
        root?.unmount();
      });
      container.remove();
    },
  };
};

describe('JamChatMessage kicked branch (web)', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    h.profile.value = {
      id: 'kicked-1',
      displayName: 'Kicked Person',
      handle: 'kicked',
    };
    h.loading.value = false;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the dedicated "was removed" copy, not the generic attendance branch', () => {
    const { container, unmount } = renderMessage({
      ...baseMessage,
      type: 'kicked',
    });
    const text = container.textContent ?? '';
    // The dedicated branch: the profile display name plus the shipped
    // `jams.chat.wasRemoved` value.
    expect(text).toContain('Kicked Person');
    expect(text).toContain(lookup('jams.chat.wasRemoved'));
    // If `kicked` had been (re)added to the `attendance` array, the generic
    // branch would render the raw type as the label ("… kicked the jam")
    // instead of the dedicated copy — that wrong output must not appear.
    expect(text).not.toContain('kicked the jam');
    unmount();
  });

  it('still routes real attendance events (join) through the generic branch', () => {
    // Guards against the fix overshooting: `join` must keep the generic
    // "X joined the jam" rendering, proving the dedicated branch is only
    // special-casing `kicked`.
    const { container, unmount } = renderMessage({
      ...baseMessage,
      type: 'join',
    });
    expect(container.textContent).toContain('Kicked Person joined the jam');
    unmount();
  });
});

describe('JamChatMessage delete affordance (web, issue #1587)', () => {
  const message = {
    ...baseMessage,
    type: 'message',
    content: 'hello',
  } as JamEvent;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    h.profile.value = {
      id: 'author-1',
      displayName: 'Author',
      handle: 'author',
    };
    h.loading.value = false;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the three-dot delete trigger only when onDelete is provided', () => {
    const { container, unmount } = renderMessage(message);
    expect(
      container.querySelector('button[title="Delete message"]'),
    ).toBeNull();
    unmount();

    const { container: withDelete, unmount: u2 } = renderMessage(
      message,
      () => undefined,
    );
    expect(
      withDelete.querySelector('button[title="Delete message"]'),
    ).not.toBeNull();
    u2();
  });

  it('fires onDelete exactly once when the Delete item is chosen', () => {
    const onDelete = vi.fn();
    const { container, unmount } = renderMessage(message, onDelete);
    const item = container.querySelector(
      '[data-testid="delete-item"]',
    ) as HTMLButtonElement | null;
    expect(item).not.toBeNull();
    act(() => {
      item?.click();
    });
    expect(onDelete).toHaveBeenCalledTimes(1);
    unmount();
  });
});
