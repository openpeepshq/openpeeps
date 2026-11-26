/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Event, PublicPost } from '@openpeepshq/common/types';
import { useEditEvent } from './useEventComposer';

const state = vi.hoisted(() => ({
  post: null as PublicPost | null,
  updatePost: vi.fn(),
}));

// The hook reads three context providers that carry nothing relevant to the
// prefill/save logic under test; the real event library (effectiveEventTimes,
// sameRecurrenceId, upsertEventException, normalizeEventDataForSave) runs.
vi.mock('../../i18n/context', () => ({
  useT: () => (key: string, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? key,
}));

vi.mock('../../contexts/router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePost: () => ({ data: state.post }),
      updatePostAction: () => state.updatePost,
    },
  }),
}));

const EVENT_ID = '019f3e5e-b11f-7e8a-b3ca-a9cc0c77a5e7';

// A weekly 21:00Z series in Room A; the 14th slot is moved to 23:00Z and
// relocated to Room B, the 21st slot is a time-only reschedule.
const SERIES_START = '2026-07-07T21:00:00.000Z';
const SERIES_END = '2026-07-07T22:00:00.000Z';
const MOVED_SLOT = '2026-07-14T21:00:00.000Z';
const MOVED_START = '2026-07-14T23:00:00.000Z';
const MOVED_END = '2026-07-15T00:00:00.000Z';
const TIME_ONLY_SLOT = '2026-07-21T21:00:00.000Z';
const MOVED_ROOM = { text: '[TEST] Room B (moved)' };

const eventPost = (data: Record<string, unknown>): PublicPost =>
  ({
    id: EVENT_ID,
    type: 'event',
    visibility: 'public',
    data: { type: 'event', content: '', ...data },
  }) as PublicPost;

const recurringEventData = {
  name: 'Testing with Trivia',
  start: SERIES_START,
  end: SERIES_END,
  wholeDay: false,
  physicalLocation: { text: '[TEST] Room A' },
  recurrence: { freq: 'WEEKLY' as const, interval: 1, count: 4 },
  exceptions: [
    {
      recurrenceId: MOVED_SLOT,
      start: MOVED_START,
      end: MOVED_END,
      physicalLocation: MOVED_ROOM,
    },
    {
      recurrenceId: TIME_ONLY_SLOT,
      start: '2026-07-21T22:00:00.000Z',
      end: '2026-07-21T23:00:00.000Z',
    },
  ],
};

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let captured: ReturnType<typeof useEditEvent> | undefined;

const renderEditEvent = (post: PublicPost, occurrence?: string) => {
  state.post = post;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const Host = () => {
    captured = useEditEvent(EVENT_ID, occurrence);
    return null;
  };
  act(() => {
    root?.render(createElement(Host));
  });
};

describe('useEditEvent occurrence prefill', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state.updatePost.mockClear();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    captured = undefined;
    state.post = null;
  });

  it('prefills a rescheduled occurrence with its own times and location', () => {
    renderEditEvent(eventPost(recurringEventData), MOVED_SLOT);
    const data = captured?.postData;
    if (data?.data.type !== 'event') return;
    // The moved slot's own start/end (not the series times) ...
    expect(data.data.start).toBe(MOVED_START);
    expect(data.data.end).toBe(MOVED_END);
    // ... and its own room, not the series room.
    expect(data.data.physicalLocation?.text).toBe(MOVED_ROOM.text);
  });

  it('keeps the moved occurrence room through a time-only save', async () => {
    renderEditEvent(eventPost(recurringEventData), MOVED_SLOT);
    const initial = captured?.postData;
    expect(initial).toBeTruthy();
    // A time-only edit of the moved date (the exact overwrite path from the
    // bug report: the series room must not land in the exception).
    act(() => {
      captured?.setPostData({
        ...initial!,
        data: {
          ...(initial!.data as Event),
          start: '2026-07-14T22:00:00.000Z',
          end: '2026-07-14T23:00:00.000Z',
        },
      });
    });
    await act(async () => {
      await captured?.submit();
    });
    expect(state.updatePost).toHaveBeenCalledOnce();
    const saved = state.updatePost.mock.calls[0]?.[0] as Event;
    // The other exception (the time-only reschedule) is untouched alongside.
    expect(saved.exceptions?.length).toBe(2);
    const moved = saved.exceptions?.find((e) =>
      e.recurrenceId.includes('2026-07-14'),
    );
    expect(moved?.physicalLocation?.text).toBe(MOVED_ROOM.text);
    expect(moved?.start).toBe('2026-07-14T22:00:00.000Z');
    expect(moved?.end).toBe('2026-07-14T23:00:00.000Z');
    // The series definition itself is untouched.
    expect(saved.start).toBe(SERIES_START);
    expect(saved.physicalLocation?.text).toBe('[TEST] Room A');
  });

  it('keeps the series location for a time-only rescheduled occurrence', async () => {
    renderEditEvent(eventPost(recurringEventData), TIME_ONLY_SLOT);
    const data = captured?.postData;
    if (data?.data.type !== 'event') throw new Error('expected loaded event');
    // No exception location set, so the series room stands.
    expect(data.data.start).toBe('2026-07-21T22:00:00.000Z');
    expect(data.data.physicalLocation?.text).toBe('[TEST] Room A');
    await act(async () => {
      await captured?.submit();
    });
    const saved = state.updatePost.mock.calls[0]?.[0] as Event;
    const savedException = saved.exceptions?.find((e) =>
      e.recurrenceId.includes('2026-07-21'),
    );
    // The form carried the series room (no override exists for this slot),
    // so saving it keeps that room — the prefill and the save agree.
    expect(savedException?.physicalLocation?.text).toBe('[TEST] Room A');
    expect(saved.exceptions?.length).toBe(2);
  });
});
