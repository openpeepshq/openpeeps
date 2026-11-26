/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { JamEvent } from '@openpeepshq/common/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JamChatDrawer } from './JamChatDrawer';

// Failure-path pin for the web delete UX (issue #1587, round-2 suggestion 3).
// The drawer owns the error handling: `handleDeleteMessage` catches a
// rejecting `removeMessage` (console log + the message staying in the list is
// web's failure signal; RN shows a toast) and unconditionally clears the
// deletable id. The modal mock mirrors the real modal's contract — close only
// after `await onDelete()` resolves — so if the drawer stopped catching the
// rejection, `onDelete` would reject, the dialog would stay open, and an
// unhandled rejection would fire. All three are asserted.
const h = vi.hoisted(() => ({
  messages: [] as JamEvent[],
  canDelete: false,
  removeMessage: vi.fn(async (_id?: string) => {}),
}));

vi.mock('lucide-react', () => ({
  Loader: () => null,
  SendHorizontal: () => null,
  X: () => null,
}));

vi.mock('@livekit/components-react', () => ({
  useParticipants: () => [],
}));

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../hooks/jams/useJamChat', () => ({
  useJamChat: () => ({
    messages: h.messages,
    mentionProfiles: [],
    isLoading: false,
    isFetchingNextPage: false,
    loadOlder: vi.fn(),
    newMessage: '',
    setNewMessage: vi.fn(),
    isSending: false,
    send: vi.fn(async () => true),
    canDeleteMessage: (_message: JamEvent) => h.canDelete,
    removeMessage: (id: string) => h.removeMessage(id),
  }),
}));

vi.mock('./JamChatMessage', () => ({
  JamChatMessage: (props: { message: JamEvent; onDelete?: () => void }) => (
    <button
      type="button"
      data-message-id={props.message.id}
      onClick={props.onDelete}
    >
      {String(props.message.content ?? '')}
    </button>
  ),
}));

vi.mock('./DeleteMessageModal', () => ({
  DeleteMessageModal: (props: {
    open: boolean;
    onClose: () => void;
    onDelete: () => Promise<void>;
  }) =>
    props.open ? (
      <button
        type="button"
        data-testid="delete-modal-action"
        onClick={() => {
          // The real modal's contract: close only after `await onDelete()`
          // resolves. If `onDelete` rejected, `onClose` would never run and
          // the dialog would stay open — so the drawer's catch is what
          // guarantees the close.
          void (async () => {
            await props.onDelete();
            props.onClose();
          })();
        }}
      >
        delete
      </button>
    ) : (
      <span data-testid="delete-modal-closed" />
    ),
}));

const message = {
  id: 'evt-1',
  jamId: 'jam-1',
  profileId: 'author-1',
  createdAt: '2026-11-22T20:00:00.000Z',
  updatedAt: '2026-11-22T20:00:00.000Z',
  type: 'message',
  content: 'hello',
} as JamEvent;

const renderDrawer = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  act(() => {
    root = createRoot(container);
    root.render(<JamChatDrawer open onClose={() => undefined} />);
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

describe('JamChatDrawer delete failure path (web, issue #1587)', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    h.messages = [message];
    h.canDelete = true;
    h.removeMessage.mockReset();
    h.removeMessage.mockImplementation(async () => {});
    class MockIntersectionObserver {
      observe() {
        // no-op
      }
      unobserve() {
        // no-op
      }
      disconnect() {
        // no-op
      }
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    // jsdom has no scrollIntoView (the drawer's open effect calls it).
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: () => {},
      configurable: true,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (HTMLElement.prototype as { scrollIntoView?: () => void })
      .scrollIntoView;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('closes the modal, keeps the message, and swallows a rejected remove', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    h.removeMessage.mockImplementation(async () => {
      throw new Error('delete failed');
    });
    const unhandled: unknown[] = [];
    const onRejection = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onRejection);

    const { container, unmount } = renderDrawer();
    // Long-press equivalent: the delete affordance opens the modal.
    const trigger = container.querySelector(
      'button[data-message-id="evt-1"]',
    ) as HTMLButtonElement | null;
    expect(trigger).not.toBeNull();
    act(() => {
      trigger?.click();
    });
    expect(
      container.querySelector('[data-testid="delete-modal-action"]'),
    ).not.toBeNull();

    // The confirm button: a rejecting `removeMessage` flows through the
    // drawer's catch.
    const action = container.querySelector(
      'button[data-testid="delete-modal-action"]',
    ) as HTMLButtonElement | null;
    act(() => {
      action?.click();
    });
    // Flush microtasks, then the rejection task (where an unhandled
    // rejection would have surfaced).
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    process.removeListener('unhandledRejection', onRejection);

    // Assert on the DOM while it is still mounted (unmount clears it).
    expect(h.removeMessage).toHaveBeenCalledWith('evt-1');
    // The drawer's catch ran — web's only failure signal.
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to delete jam chat message',
    );
    // The drawer cleared the deletable id, so the modal closed even though
    // `onDelete` rejected (the modal itself never got to its `onClose`).
    expect(
      container.querySelector('[data-testid="delete-modal-action"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="delete-modal-closed"]'),
    ).not.toBeNull();
    // The failed delete left the message in place.
    expect(
      container.querySelector('button[data-message-id="evt-1"]'),
    ).not.toBeNull();

    unmount();
    expect(unhandled).toHaveLength(0);
  });
});
